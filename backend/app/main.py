import uuid
import json
import logging
import time
import asyncio
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.api.routes import router
from app.core.config import settings
from app import models  # noqa: F401
from app.db.session import SessionLocal
from app.models import Scan, User


async def _retention_worker():
    while True:
        db = SessionLocal()
        try:
            users = db.query(User).filter(User.scan_retention_days.is_not(None)).all()
            now = datetime.now(timezone.utc)
            for user in users:
                cutoff = now - timedelta(days=user.scan_retention_days)
                expired = db.query(Scan).filter(Scan.user_id == user.id, Scan.created_at < cutoff).all()
                for scan in expired:
                    db.delete(scan)
                if expired:
                    db.commit()
        except Exception:
            db.rollback()
            logging.getLogger("prooflens.maintenance").exception("Scan-retention cleanup failed")
        finally:
            db.close()
        await asyncio.sleep(24 * 60 * 60)


@asynccontextmanager
async def lifespan(_: FastAPI):
    retention_task = asyncio.create_task(_retention_worker())
    try:
        yield
    finally:
        retention_task.cancel()
        try:
            await retention_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title=settings.app_name, version="0.1.0", description="Evidence-first digital safety checks. Local analyzers only; no URL fetching.", lifespan=lifespan)
request_logger = logging.getLogger("prooflens.requests")
_rate_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_RATE_POLICIES = {"auth": (10, 60), "analysis": (30, 60), "upload": (8, 60)}
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$" if settings.app_env in {"development", "test"} else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def request_id_and_security_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    request.state.request_id = request_id
    started = time.monotonic()
    path = request.url.path
    category = "auth" if path in {"/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/mobile/login", "/api/v1/auth/mobile/register", "/api/v1/auth/mobile/refresh"} else "upload" if path in {"/api/v1/analyze/image", "/api/v1/analyze/qr", "/api/v1/analyze/screenshot"} else "analysis" if path.startswith("/api/v1/analyze/") else None
    status = 500
    if category and request.client:
        maximum, window = _RATE_POLICIES[category]
        # Local integration suites share a single loopback client across workers;
        # avoid false 429s between unrelated QA accounts. Development and
        # production keep the stricter per-category limits above.
        if settings.app_env == "test":
            maximum = {"auth": 50, "analysis": 120, "upload": 30}[category]
        bucket = _rate_buckets[(category, request.client.host)]
        now = time.monotonic()
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= maximum:
            response = JSONResponse(status_code=429, content={"success":False,"error":{"code":"RATE_LIMITED","message":"Too many requests. Please try again shortly."},"request_id":request_id})
            response.headers["Retry-After"] = str(max(1, int(window - (now - bucket[0]))))
            return response
        bucket.append(now)
    response = await call_next(request)
    status = response.status_code
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    route = request.scope.get("route")
    request_logger.info(json.dumps({"event":"http.request","request_id":request_id,"method":request.method,"route":getattr(route,"path","unmatched"),"status":status,"duration_ms":round((time.monotonic()-started)*1000,2)}, separators=(",",":")))
    return response


@app.exception_handler(Exception)
async def safe_unexpected_error(request: Request, _: Exception):
    return JSONResponse(status_code=500, content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "The request could not be completed."}, "request_id": getattr(request.state, "request_id", str(uuid.uuid4()))})


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    code = {401:"UNAUTHORIZED",403:"FORBIDDEN",404:"NOT_FOUND",409:"CONFLICT",413:"FILE_TOO_LARGE",415:"UNSUPPORTED_MEDIA",422:"INVALID_INPUT",429:"RATE_LIMITED"}.get(exc.status_code,"REQUEST_FAILED")
    message = exc.detail if isinstance(exc.detail,str) else "The request could not be completed."
    return JSONResponse(status_code=exc.status_code,headers=exc.headers,content={"success":False,"error":{"code":code,"message":message},"request_id":getattr(request.state,"request_id",str(uuid.uuid4()))})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, _: RequestValidationError):
    return JSONResponse(status_code=422,content={"success":False,"error":{"code":"INVALID_INPUT","message":"Please check the submitted fields and try again."},"request_id":getattr(request.state,"request_id",str(uuid.uuid4()))})


@app.get("/health")
def health():
    local_ai_configured = bool(settings.local_ai_url and settings.local_ai_model)
    return {"success": True, "data": {"status": "ok", "analysis_mode": "local-model-assisted" if local_ai_configured else "local-rules-only", "local_ai_model": settings.local_ai_model if local_ai_configured else None}, "request_id": str(uuid.uuid4())}


app.include_router(router, prefix="/api/v1")
