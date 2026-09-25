import secrets
import uuid
import hashlib
import io
import logging
import textwrap
from datetime import date, datetime, timedelta, timezone
from jose import JWTError, jwt

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.analyzers.message_analyzer import analyze_message
from app.analyzers.url_analyzer import analyze_url
from app.db.session import get_db
from app.models import AuditLog, AuthSession, Evidence, PasswordResetToken, Scan, User
from app.core.config import settings
from app.schemas import AccountDeleteRequest, AnalyzeRequest, ClaimAnalyzeRequest, LoginRequest, PasswordChangeRequest, PasswordResetConfirm, PasswordResetRequest, ProfileUpdateRequest, ProductAnalyzeRequest, RegisterRequest, StoreAnalyzeRequest
from app.security import ALGORITHM, create_access_token, create_refresh_token, current_user, digest_token, hash_password, verify_password
from app.services.risk_engine import Finding, score_findings
from app.providers.ocr import extract_text
from app.providers.email import send_password_reset_email
from app.providers.threat_intel import check_url_feeds
from app.providers.scanning import analyze_media, scan_with_antivirus, scan_with_yara, scan_with_local_signatures
from app.analyzers.file_analyzer import inspect_file
from app.analyzers.store_analyzer import analyze_store, analyze_product
from app.analyzers.claim_analyzer import analyze_claim
from app.providers.fact_checks import search_fact_checks
from app.providers.local_ai import explain_message
from app.services.safe_fetch import fetch_public_page

router = APIRouter()
logger = logging.getLogger("prooflens.security")


def _is_expired(value: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)


def _scan_payload(scan: Scan) -> dict:
    return {
        "scan_id": scan.public_id,
        "scan_type": scan.scan_type,
        "risk_score": scan.risk_score,
        "risk_level": scan.risk_level,
        "confidence": scan.confidence,
        "summary": scan.summary,
        "evidence": [{"title": item.title, "description": item.description, "severity": item.severity, "source": item.source} for item in scan.evidence],
        "recommendations": scan.recommendations,
        "is_saved": scan.is_saved,
        "analysis_meta": scan.analysis_meta,
        "status": scan.status,
        "created_at": scan.created_at,
    }


def _provider_safe_export(scan: Scan) -> dict:
    """Exclude vendor-restricted findings from public/shareable report outputs."""
    payload = _scan_payload(scan)
    exportable = [item for item in scan.evidence if item.evidence_type not in {"threat_feed_match", "ai_generated_signal", "deepfake_signal"}]
    restricted = len(exportable) != len(scan.evidence)
    payload["evidence"] = [{"title": item.title, "description": item.description, "severity": item.severity, "source": item.source} for item in exportable]
    findings = [Finding(item.title, item.description, item.severity, item.source, item.evidence_type, item.weight) for item in exportable]
    payload["risk_score"], payload["risk_level"], payload["confidence"] = score_findings(findings)
    if restricted:
        payload["summary"] = "This export omits provider-restricted findings. Sign in to ProofLens to view the complete assessment."
    claim_sources = payload.get("analysis_meta", {}).get("claim_sources")
    payload.pop("analysis_meta", None)
    if claim_sources:
        payload["sources"] = claim_sources
    return payload


def _audit(db: Session, user_id: str | None, event: str, resource_id: str | None = None):
    db.add(AuditLog(actor_user_id=user_id, event=event, resource_id=resource_id, metadata_json={}))


def _set_session_cookie(response: Response, user_id: str, db: Session):
    jti = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    db.add(AuthSession(user_id=user_id, refresh_jti_hash=digest_token(jti), expires_at=expires))
    db.commit()
    response.set_cookie("prooflens_access", create_access_token(user_id), httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax", path="/api/v1", max_age=settings.access_token_expire_minutes * 60)
    response.set_cookie("prooflens_refresh", create_refresh_token(user_id, jti), httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax", path="/api/v1/auth", max_age=settings.refresh_token_expire_days * 86400)


@router.post("/auth/register", status_code=201)
def register(body: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, "An account with this email already exists.")
    user = User(email=email, display_name=body.display_name.strip(), phone=(body.phone or "").strip() or None, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_session_cookie(response, user.id, db)
    _audit(db, user.id, "account.registered")
    db.commit()
    return {"success": True, "data": {"user": {"id": user.id, "email": user.email, "display_name": user.display_name, "phone": user.phone}}, "request_id": str(uuid.uuid4())}


@router.post("/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.lower()).first()
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    _set_session_cookie(response, user.id, db)
    _audit(db, user.id, "auth.login")
    db.commit()
    return {"success": True, "data": {"user": {"id": user.id, "email": user.email, "display_name": user.display_name, "phone": user.phone}}, "request_id": str(uuid.uuid4())}


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _revoke_refresh_cookie(request, db, user.id)
    _audit(db, user.id, "auth.logout")
    db.commit()
    response.delete_cookie("prooflens_access", path="/api/v1", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    response.delete_cookie("prooflens_refresh", path="/api/v1/auth", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    return {"success": True, "data": {"message": "Session ended."}, "request_id": str(uuid.uuid4())}


def _revoke_refresh_cookie(request: Request, db: Session, user_id: str | None = None):
    token = request.cookies.get("prooflens_refresh")
    if not token:
        return
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        subject = payload.get("sub")
    except JWTError:
        return
    if not jti or (user_id and user_id != subject):
        return
    session = db.query(AuthSession).filter_by(user_id=subject, refresh_jti_hash=digest_token(jti), revoked_at=None).first()
    if session:
        session.revoked_at = datetime.now(timezone.utc)


@router.post("/auth/refresh")
def refresh_session(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("prooflens_refresh")
    if not token:
        raise HTTPException(401, "A refresh session is required.")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(401, "Refresh session is invalid or expired.") from exc
    user_id, jti = payload.get("sub"), payload.get("jti")
    if payload.get("type") != "refresh" or not user_id or not jti:
        raise HTTPException(401, "Refresh session is invalid.")
    session = db.query(AuthSession).filter_by(user_id=user_id, refresh_jti_hash=digest_token(jti), revoked_at=None).first()
    if not session or _is_expired(session.expires_at):
        raise HTTPException(401, "Refresh session is invalid or expired.")
    new_jti = secrets.token_urlsafe(32)
    session.refresh_jti_hash = digest_token(new_jti)
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    _audit(db, user_id, "auth.refresh")
    db.commit()
    response.set_cookie("prooflens_access", create_access_token(user_id), httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax", path="/api/v1", max_age=settings.access_token_expire_minutes * 60)
    response.set_cookie("prooflens_refresh", create_refresh_token(user_id, new_jti), httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax", path="/api/v1/auth", max_age=settings.refresh_token_expire_days * 86400)
    return {"success": True, "data": {"refreshed": True}, "request_id": str(uuid.uuid4())}


@router.post("/auth/forgot-password")
def forgot_password(body: PasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Keep the response the same whether the address exists or SMTP is configured.
    user = db.query(User).filter_by(email=body.email.lower(), is_active=True).first()
    development_reset_token = None
    if user and ((settings.smtp_host and settings.email_from) or settings.app_env in {"development", "test"}):
        raw_token = secrets.token_urlsafe(32)
        reset = PasswordResetToken(user_id=user.id, token_hash=digest_token(raw_token), expires_at=datetime.now(timezone.utc) + timedelta(minutes=30))
        db.add(reset)
        _audit(db, user.id, "auth.password_reset_requested")
        db.commit()
        if settings.smtp_host and settings.email_from:
            background_tasks.add_task(send_password_reset_email, user.email, raw_token)
        elif settings.app_env in {"development", "test"}:
            development_reset_token = raw_token
    data = {"message": "If the account exists and delivery is configured, a password reset link is ready."}
    if development_reset_token:
        data["development_reset_token"] = development_reset_token
    return {"success": True, "data": data, "request_id": str(uuid.uuid4())}


@router.post("/auth/reset-password")
def reset_password(body: PasswordResetConfirm, response: Response, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter_by(token_hash=digest_token(body.token), consumed_at=None).first()
    now = datetime.now(timezone.utc)
    if not reset or _is_expired(reset.expires_at):
        raise HTTPException(400, "Reset link is invalid or expired.")
    user = db.get(User, reset.user_id)
    if not user or not user.is_active:
        raise HTTPException(400, "Reset link is invalid or expired.")
    reset.consumed_at = now
    user.password_hash = hash_password(body.new_password)
    db.query(AuthSession).filter_by(user_id=user.id, revoked_at=None).update({"revoked_at": now}, synchronize_session=False)
    _audit(db, user.id, "auth.password_reset_completed")
    db.commit()
    response.delete_cookie("prooflens_access", path="/api/v1", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    response.delete_cookie("prooflens_refresh", path="/api/v1/auth", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    return {"success": True, "data": {"password_updated": True}, "request_id": str(uuid.uuid4())}


@router.delete("/auth/me")
def delete_account(body: AccountDeleteRequest, request: Request, response: Response, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Password confirmation failed.")
    _audit(db, user.id, "account.deleted")
    db.query(PasswordResetToken).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(AuthSession).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    response.delete_cookie("prooflens_access", path="/api/v1", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    response.delete_cookie("prooflens_refresh", path="/api/v1/auth", httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax")
    return {"success": True, "data": {"deleted": True}, "request_id": str(uuid.uuid4())}


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return {"success": True, "data": {"id": user.id, "email": user.email, "display_name": user.display_name, "phone": user.phone, "avatar_url": "/api/v1/auth/me/avatar" if user.avatar_data else None}, "request_id": str(uuid.uuid4())}


@router.patch("/auth/me")
def update_profile(body: ProfileUpdateRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.display_name = body.display_name.strip()
    user.phone = (body.phone or "").strip() or None
    _audit(db, user.id, "account.profile_updated")
    db.commit()
    return {"success": True, "data": {"id": user.id, "email": user.email, "display_name": user.display_name, "phone": user.phone, "avatar_url": "/api/v1/auth/me/avatar" if user.avatar_data else None}, "request_id": str(uuid.uuid4())}


@router.get("/auth/me/avatar")
def profile_avatar(user: User = Depends(current_user)):
    if not user.avatar_data:
        raise HTTPException(404, "No profile photo has been uploaded.")
    return Response(content=user.avatar_data, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})


@router.post("/auth/me/avatar")
async def update_profile_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    from io import BytesIO
    from PIL import Image, UnidentifiedImageError

    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Choose a JPEG, PNG, or WEBP profile photo.")
    blob = await file.read(3 * 1024 * 1024 + 1)
    if len(blob) > 3 * 1024 * 1024:
        raise HTTPException(413, "Profile photo must be 3 MB or smaller.")
    try:
        with Image.open(BytesIO(blob)) as source:
            if source.width * source.height > 20_000_000:
                raise HTTPException(413, "Profile photo dimensions are too large.")
            source.load()
            image = source.convert("RGBA") if source.mode in {"RGBA", "LA", "P"} else source.convert("RGB")
            image.thumbnail((512, 512))
            if image.mode == "RGBA":
                background = Image.new("RGB", image.size, "white")
                background.paste(image, mask=image.getchannel("A"))
                image = background
            output = BytesIO()
            image.save(output, format="JPEG", quality=86, optimize=True)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(422, "The selected file is not a valid image.") from exc
    user.avatar_data = output.getvalue()
    _audit(db, user.id, "account.avatar_updated")
    db.commit()
    return {"success": True, "data": {"avatar_url": "/api/v1/auth/me/avatar"}, "request_id": str(uuid.uuid4())}


@router.post("/auth/change-password")
def change_password(body: PasswordChangeRequest, request: Request, response: Response, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect.")
    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(422, "Choose a different new password.")
    keep_hash = None
    refresh = request.cookies.get("prooflens_refresh")
    if refresh:
        try:
            claims = jwt.decode(refresh, settings.jwt_secret, algorithms=[ALGORITHM])
            if claims.get("sub") == user.id and claims.get("type") == "refresh" and claims.get("jti"):
                keep_hash = digest_token(claims["jti"])
        except JWTError:
            pass
    sessions = db.query(AuthSession).filter_by(user_id=user.id, revoked_at=None).all()
    now = datetime.now(timezone.utc)
    for session in sessions:
        if session.refresh_jti_hash != keep_hash:
            session.revoked_at = now
    user.password_hash = hash_password(body.new_password)
    _audit(db, user.id, "account.password_changed")
    db.commit()
    response.set_cookie("prooflens_access", create_access_token(user.id), httponly=True, secure=settings.app_env not in {"development", "test"}, samesite="lax", path="/api/v1", max_age=settings.access_token_expire_minutes * 60)
    return {"success": True, "data": {"password_updated": True, "other_sessions_revoked": True}, "request_id": str(uuid.uuid4())}


def _create_scan(scan_type: str, content: str, findings: list, summary: str, recommendations: list[str], db: Session, user: User, analysis_meta: dict | None = None, status: str = "COMPLETED") -> dict:
    score, level, confidence = score_findings(findings)
    scan = Scan(
        public_id=f"PL-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}",
        user_id=user.id, scan_type=scan_type, content=content[:12000], status=status,
        risk_score=score, risk_level=level, confidence=confidence, summary=summary,
        recommendations=recommendations, analysis_meta=analysis_meta or {},
    )
    db.add(scan)
    db.flush()
    for item in findings:
        db.add(Evidence(scan_id=scan.id, source=item.source, evidence_type=item.evidence_type, severity=item.severity,
                        confidence="MEDIUM" if item.weight else "LOW", weight=item.weight, title=item.title,
                        description=item.description, raw_data_json={}))
    db.commit()
    return _scan_payload(db.query(Scan).options(selectinload(Scan.evidence)).filter_by(id=scan.id).one())


@router.post("/analyze/url")
def analyze_url_endpoint(body: AnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try:
        host, findings, _, messages = analyze_url(body.content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    summary, *actions = messages
    feed_findings, feed_status = check_url_feeds(body.content)
    findings.extend(feed_findings)
    fetch_meta = {"status": "not_requested"}
    if body.fetch_page:
        page_url = body.content if "://" in body.content else f"https://{body.content}"
        fetch_meta = fetch_public_page(page_url)
        if fetch_meta.get("status") == "fetched":
            for form in fetch_meta.get("forms", []):
                fields = " ".join(form.get("fields", [])).lower()
                if any(term in fields for term in ("password", "current-password", "new-password")):
                    findings.append(Finding("Password field found on fetched page", "The page contains a password input. This is not proof of phishing; verify the domain before signing in.", "LOW", "Fetched page form inspection", "credential_form", 8))
                if any(term in fields for term in ("credit-card", "cc-number", "cardnumber", "payment")):
                    findings.append(Finding("Payment field found on fetched page", "The page appears to request payment information. Confirm the merchant and address before entering it.", "INFO", "Fetched page form inspection", "payment_form", 0))
        elif fetch_meta.get("status") == "blocked_or_unavailable":
            findings.append(Finding("Live page could not be safely inspected", "The optional page request was blocked by URL safety checks or the host could not be reached. Local URL analysis still ran.", "INFO", "Safe page fetch", "page_fetch_unavailable", 0))
    score, level, _ = score_findings(findings)
    summary = "Current checks found multiple warning signals. Avoid interacting until you verify the destination independently." if level in {"HIGH", "CRITICAL"} else "Some caution signals were found. Check the destination through an official channel before sharing sensitive information." if level == "CAUTION" else "No major indicators were found by the checks available for this request. This does not guarantee safety."
    actions = ["Do not enter passwords, one-time codes, or payment details unless you independently verify the site.", "Open the organization's official app or type its known address yourself."]
    payload = _create_scan("URL", body.content, findings, summary, actions, db, user, {"threat_feeds": feed_status, "page_fetch": fetch_meta})
    payload["hostname"] = host
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


@router.post("/analyze/store")
def analyze_store_endpoint(body: StoreAnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try:
        findings, metadata = analyze_store(body.url, body.context, body.fetch_page)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    feed_findings, feed_status = check_url_feeds(body.url)
    findings.extend(feed_findings)
    metadata["threat_feeds"] = feed_status
    score, level, _ = score_findings(findings)
    summary = "Several store warning signals were detected. Review the evidence and independently verify the seller." if level in {"CAUTION", "HIGH", "CRITICAL"} else ("Store text was fetched over HTTPS, but the seller and business details are not authenticated." if metadata.get("website_content_fetched") else "No major warning was found from the submitted details. The seller and store policies were not verified.")
    payload = _create_scan("STORE", f"{body.url} {body.context}".strip(), findings, summary, ["Verify the seller using contact details from an independent source.", "Review return and payment terms before purchasing."], db, user, metadata)
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


@router.post("/analyze/product")
def analyze_product_endpoint(body: ProductAnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    description = body.description.strip()
    url = body.url
    if not description.strip() and not url:
        raise HTTPException(422, "Provide a product description or URL.")
    try:
        findings, metadata = analyze_product(url, description, body.price, body.reference_price, body.fetch_page)
    except (TypeError, ValueError) as exc:
        raise HTTPException(422, str(exc)) from exc
    if url:
        feed_findings, feed_status = check_url_feeds(url)
        findings.extend(feed_findings)
        metadata["threat_feeds"] = feed_status
    content = " ".join(part for part in (url or "", description) if part)[:12000]
    _, level, _ = score_findings(findings)
    summary = "Some listing signals need review. Seller claims and submitted reference prices have not been independently checked." if level != "LOW" else "No notable warning was found in the details provided. This does not authenticate the seller or physical product."
    payload = _create_scan("PRODUCT", content, findings, summary, ["Verify the seller and warranty with the manufacturer using independently sourced contact details.", "Do not treat a photo or claimed discount as proof of authenticity."], db, user, metadata)
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


@router.post("/analyze/claim")
def analyze_claim_endpoint(body: ClaimAnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    claim = body.claim.strip()
    findings, metadata = analyze_claim(claim, body.organization, body.location)
    provider = search_fact_checks(claim)
    supplied_sources = []
    supplied_status = []
    for candidate in body.source_urls[:3]:
        if len(candidate) > 2048:
            supplied_status.append("invalid_url")
            continue
        fetched = fetch_public_page(candidate)
        supplied_status.append(fetched.get("status", "unavailable"))
        if fetched.get("status") == "fetched":
            supplied_sources.append({"publisher": fetched.get("hostname", "User-supplied source"),
                                     "url": fetched["final_url"], "title": fetched.get("title") or fetched["final_url"],
                                     "review_date": "", "rating": "User-supplied reference; not independently fact-checked"})
    metadata["claim_sources"] = [{key: source[key] for key in ("publisher", "url", "title", "review_date", "rating")} for source in [*provider["sources"], *supplied_sources]]
    metadata["user_reference_fetch_status"] = supplied_status
    metadata["claim_provider_status"] = provider["status"]
    metadata["verdict"] = provider["verdict"]
    if provider["sources"]:
        findings = [Finding("Published fact-check reviews found", f"{len(provider['sources'])} published review(s) were found. Publisher ratings are attributed opinions; read each source before drawing a conclusion.", "INFO", "Google Fact Check Tools", "claim_sources_found", 0)]
    elif supplied_sources:
        findings = [Finding("User-supplied references fetched", f"{len(supplied_sources)} public HTTPS reference page(s) were fetched. ProofLens has not verified the publisher or assessed whether the pages support the claim.", "INFO", "User-supplied references", "claim_user_references", 0)]
    verdict = provider["verdict"]
    summary = f"Available publisher reviews suggest: {verdict.lower()}. These are attributed publisher ratings, not an independent ProofLens finding." if provider["sources"] else f"{len(supplied_sources)} user-supplied reference(s) were fetched, but not independently checked. There is not enough verified evidence to determine the claim." if supplied_sources else "There are not enough verified sources available to determine whether this claim is supported or contradicted."
    action = "Open the linked publisher reviews and inspect their evidence and dates." if provider["sources"] else "Open the supplied reference pages and compare them with primary statements and the claim's date." if supplied_sources else "Check current statements from the named organization and trusted independent sources."
    payload = _create_scan("CLAIM", claim, findings, summary, [action], db, user, metadata, status="COMPLETED" if provider["sources"] else "PARTIAL")
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


@router.post("/analyze/file")
def analyze_file_endpoint(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    maximum = settings.max_file_upload_mb * 1024 * 1024
    blob = file.file.read(maximum + 1)
    if len(blob) > maximum:
        raise HTTPException(413, f"File exceeds the {settings.max_file_upload_mb} MB limit.")
    filename = file.filename or "uploaded-file"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    supported = {"pdf", "docx", "xlsx", "pptx", "zip", "txt", "md", "csv", "exe", "dll", "docm", "xlsm", "pptm", "dotm", "xlam", "ppsm"}
    if extension not in supported:
        raise HTTPException(415, "Supported file types: PDF, DOCX, XLSX, PPTX, ZIP, text, and selected executable metadata.")
    try:
        inspected = inspect_file(filename, file.content_type, blob)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    findings = list(inspected.pop("findings"))
    yara_result = scan_with_yara(blob)
    for match in yara_result.get("matches", []):
        findings.append(Finding("YARA rule match", f"Configured YARA rule matched: {match}. Review with a security professional.", "HIGH", "YARA", "yara_match", 30))
    av_result = scan_with_antivirus(blob)
    if av_result.get("status") == "match":
        findings.append(Finding("Antivirus signature match", "ClamAV reported a signature match. Do not open the file; confirm this result with your security team.", "HIGH", "ClamAV", "antivirus_match", 40))
    local_result = scan_with_local_signatures(blob)
    for match in local_result["matches"]:
        severity = local_result["severities"][match]
        weight = 25 if severity == "HIGH" else 14 if severity == "MEDIUM" else 6 if severity == "LOW" else 0
        findings.append(Finding(match, "A local byte-pattern rule matched this file. This heuristic can produce false positives and is not a full antivirus scan.", severity, "ProofLens local static signatures", "local_file_signature", weight))
    metadata = {**inspected, "local_signatures": local_result, "yara": yara_result, "antivirus": av_result}
    status = "PARTIAL" if yara_result["status"] in {"not_configured", "unavailable"} or av_result["status"] in {"not_configured", "unavailable", "adapter_required"} else "COMPLETED"
    _, level, _ = score_findings(findings)
    summary = "Static warning signals were found. The uploaded content was never executed." if level != "LOW" else "Basic static inspection found no configured warning signatures. No antivirus clearance is available unless a scanner is configured."
    payload = _create_scan("FILE", filename[:255], findings, summary, ["Do not open unexpected files.", "Keep endpoint protection enabled and confirm the sender through a separate channel."], db, user, metadata, status=status)
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


def _pdf_bytes(lines: list[str]) -> bytes:
    """Build a small text-only PDF without rendering untrusted HTML or uploading files."""
    def esc(value: str) -> str:
        value = " ".join(value.replace("\r", " ").replace("\n", " ").split())
        value = value.encode("latin-1", "replace").decode("latin-1")
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = "BT /F1 10 Tf 48 790 Td 14 TL " + " ".join(f"({esc(line[:150])}) Tj T*" for line in lines[:48]) + " ET"
    stream = text.encode("latin-1")
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>", b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"]
    output = bytearray(b"%PDF-1.4\n%ProofLens\n")
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(output)


@router.get("/reports/{public_id}/pdf")
def download_report_pdf(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).options(selectinload(Scan.evidence)).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Report not found.")
    safe_report = _provider_safe_export(scan)
    lines = ["PROOFLENS VERIFICATION REPORT", f"Scan: {scan.public_id}", f"Type: {scan.scan_type}", f"Risk: {safe_report['risk_level']} ({safe_report['risk_score']}/100)", f"Confidence: {safe_report['confidence']}", "", "Summary:", *textwrap.wrap(safe_report["summary"], 86)[:3], "", "Evidence:"]
    for item in scan.evidence:
        if item.evidence_type in {"threat_feed_match", "ai_generated_signal", "deepfake_signal"}:
            continue
        lines.extend([f"[{item.severity}] {item.title} ({item.source})", *textwrap.wrap(item.description, 86)[:2]])
    if safe_report.get("sources"):
        lines.extend(["", "Published fact-check reviews:"])
        for source in safe_report["sources"][:10]:
            lines.extend(textwrap.wrap(f"{source.get('publisher')}: {source.get('title')} — {source.get('rating')} ({source.get('review_date')}) {source.get('url')}", 100)[:2])
    lines.extend(["", "Recommended actions:", *[f"- {item}" for item in (scan.recommendations or [])[:5]], "", "This score is an indicator, not a probability. A low-risk result is not a safety guarantee."])
    return Response(content=_pdf_bytes(lines), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{scan.public_id}.pdf"', "Cache-Control": "private, no-store"})


@router.post("/analyze/message")
def analyze_message_endpoint(body: AnalyzeRequest, db: Session = Depends(get_db), user: User = Depends(current_user)):
    findings, _, messages = analyze_message(body.content)
    summary, *actions = messages
    import re
    urls = re.findall(r"https?://[^\s<>()]+", body.content, re.IGNORECASE)[:5]
    feed_status = {}
    matched_feed = False
    for url in urls:
        provider_findings, status = check_url_feeds(url)
        findings.extend(provider_findings)
        feed_status.update(status)
        matched_feed = matched_feed or bool(provider_findings)
    if matched_feed:
        summary = "A configured threat feed reported a match for a web address in this message. Treat this as a warning and independently verify the sender."
    local_ai = explain_message(body.content)
    payload = _create_scan("MESSAGE", body.content, findings, summary, actions, db, user, {"threat_feeds": feed_status, "local_ai": local_ai})
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


@router.post("/analyze/screenshot")
@router.post("/analyze/image")
@router.post("/analyze/qr")
def analyze_image_endpoint(request: Request, file: UploadFile = File(...), scan_kind: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    from PIL import Image, UnidentifiedImageError
    import warnings

    allowed = {"image/png", "image/jpeg", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(415, "Only PNG, JPEG, and WEBP images are supported.")
    maximum = settings.max_upload_mb * 1024 * 1024
    blob = file.file.read(maximum + 1)
    if len(blob) > maximum:
        raise HTTPException(413, f"Image exceeds the {settings.max_upload_mb} MB limit.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(blob))
        image.verify()
        image = Image.open(io.BytesIO(blob))
        if image.format not in {"PNG", "JPEG", "WEBP"}:
            raise HTTPException(415, "The image content must be PNG, JPEG, or WEBP.")
        if image.width * image.height > 40_000_000:
            raise HTTPException(413, "Image dimensions are too large to process safely.")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(415, "The uploaded file is not a valid supported image.") from exc

    kind = (scan_kind or request.url.path.rsplit("/", 1)[-1]).upper()
    if kind not in {"SCREENSHOT", "IMAGE", "QR"}:
        kind = "SCREENSHOT"
    image_format = image.format
    pixel_image = image.convert("RGB")
    text_result = extract_text(pixel_image)
    findings = []
    status = "COMPLETED" if text_result["available"] else "PARTIAL"
    extracted = text_result["text"]
    detected_urls: list[str] = []
    if extracted:
        message_findings, _, _ = analyze_message(extracted)
        findings.extend(message_findings)
        import re
        detected_urls = re.findall(r"https?://[^\s<>\]\[()]+", extracted)[:10]
    qr_value = None
    qr_feed_status = {}
    if kind == "QR":
        try:
            import cv2
            import numpy as np
            decoder = cv2.QRCodeDetector()
            qr_value, _, _ = decoder.detectAndDecode(np.array(pixel_image))
            if qr_value:
                findings.append(__qr_finding(qr_value))
                if qr_value.startswith(("http://", "https://")):
                    try:
                        _, url_findings, _, _ = analyze_url(qr_value)
                        findings.extend(item for item in url_findings if item.severity != "INFO")
                        provider_findings, qr_feed_status = check_url_feeds(qr_value)
                        findings.extend(provider_findings)
                    except ValueError:
                        findings.append(__qr_unreadable_finding())
                else:
                    findings.append(__qr_text_finding())
            else:
                findings.append(__qr_unreadable_finding())
        except ImportError:
            status = "PARTIAL"
            findings.append(__provider_missing_finding("QR decoder"))
    if kind == "IMAGE":
        findings.append(Finding("Image file inspected", f"Image is {pixel_image.width} × {pixel_image.height} pixels. Metadata presence or absence does not determine authenticity.", "INFO", "Image metadata", "image_dimensions", 0))
        image_metadata = {}
        try:
            exif = image.getexif()
            if not exif:
                findings.append(Finding("No EXIF metadata present", "Many legitimate images have no EXIF data; this finding does not indicate manipulation.", "INFO", "Image metadata", "no_exif", 0))
            else:
                from PIL.ExifTags import TAGS
                wanted = {"DateTimeOriginal": "capture_time", "DateTime": "modified_time", "Make": "camera_make", "Model": "camera_model", "Software": "editing_software"}
                for tag, value in exif.items():
                    label = TAGS.get(tag, str(tag))
                    if label in wanted and isinstance(value, (str, int, float)):
                        image_metadata[wanted[label]] = str(value)[:160]
        except Exception:
            pass
        info_keys = [str(key)[:80] for key in getattr(image, "info", {}) if any(marker in str(key).lower() for marker in ("c2pa", "content credentials", "jumb"))]
        has_c2pa_marker = bool(info_keys) or any(marker in blob.lower() for marker in (b"c2pa", b"content credentials"))
        c2pa_status = "marker_present_unverified" if has_c2pa_marker else "not_detected"
        if has_c2pa_marker:
            findings.append(Finding("Possible content-credentials marker found", "The image contains a metadata marker associated with content credentials. ProofLens did not validate a C2PA manifest or its signer.", "INFO", "Image metadata inspection", "c2pa_marker", 0))
        media_result = analyze_media(blob, file.filename or "uploaded-image", file.content_type or "application/octet-stream")
        if media_result.get("status") == "complete":
            ai_signal = media_result.get("ai_generated")
            deepfake_signal = media_result.get("deepfake")
            if ai_signal and ai_signal.get("label") in {"likely", "detected", "positive"}:
                findings.append(Finding("Configured media provider flagged AI-generated traits", "An external media provider returned a positive AI-generated-media signal. Provider output is not proof of origin.", "MEDIUM", str(media_result.get("provider", "Media provider")), "ai_generated_signal", 12))
            if deepfake_signal and deepfake_signal.get("label") in {"likely", "detected", "positive"}:
                findings.append(Finding("Configured media provider flagged possible manipulation", "An external media provider returned a possible manipulation signal. Provider output is not proof of a deepfake.", "MEDIUM", str(media_result.get("provider", "Media provider")), "deepfake_signal", 16))
    else:
        media_result = {"status": "not_applicable"}
    if not findings:
        findings.append(Finding("No local warning signals found", "No suspicious text or known image warning was detected. OCR provider availability may limit results.", "INFO", "Local analysis", "no_local_flags", 0))
    score, level, confidence = score_findings(findings)
    summary = "Local analysis found warning signals in the image content." if level != "LOW" else "No major known threat indicators were detected in the available image analysis. This does not verify image authenticity."
    recommendations = ["Do not follow links or payment instructions in the image until you verify them independently."]
    meta = {"sha256": hashlib.sha256(blob).hexdigest(), "mime_type": image_format, "width": pixel_image.width, "height": pixel_image.height, "image_metadata": image_metadata if kind == "IMAGE" else {}, "c2pa_status": c2pa_status if kind == "IMAGE" else "not_checked", "c2pa_metadata_keys": info_keys if kind == "IMAGE" else [], "ocr_available": text_result["available"], "ocr_confidence": text_result["confidence"], "extracted_text": extracted[:12000], "detected_urls": detected_urls, "qr_destination": qr_value, "threat_feeds": qr_feed_status, "media_provider": media_result, "filename": "uploaded-image"}
    payload = _create_scan(kind, extracted, findings, summary, recommendations, db, user, meta, status)
    return {"success": True, "data": payload, "request_id": str(uuid.uuid4())}


def __qr_finding(value: str):
    from app.services.risk_engine import Finding
    return Finding("QR code decoded", "A destination was decoded from the uploaded QR image. Review it before opening.", "LOW", "QR analyzer", "qr_decoded", 8)


def __qr_text_finding():
    from app.services.risk_engine import Finding
    return Finding("QR code contains non-URL content", "The QR contains text or another URI type; verify its meaning before acting.", "INFO", "QR analyzer", "qr_non_url", 0)


def __qr_unreadable_finding():
    from app.services.risk_engine import Finding
    return Finding("No readable QR code found", "The image could not be decoded as a QR code.", "INFO", "QR analyzer", "qr_not_found", 0)


def __provider_missing_finding(name: str):
    from app.services.risk_engine import Finding
    return Finding(f"{name} unavailable", "This analysis component is not available in the current environment.", "INFO", "Provider status", "provider_unavailable", 0)


@router.get("/scans")
def list_scans(
    limit: int = 50,
    offset: int = 0,
    scan_type: str | None = None,
    risk_level: str | None = None,
    saved_only: bool = False,
    query: str | None = Query(default=None, max_length=200),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    scan_query = db.query(Scan).filter_by(user_id=user.id)
    if scan_type:
        if scan_type.upper() not in {"URL", "MESSAGE", "SCREENSHOT", "IMAGE", "QR", "FILE", "STORE", "PRODUCT", "CLAIM"}:
            raise HTTPException(422, "Unsupported scan type filter.")
        scan_query = scan_query.filter(Scan.scan_type == scan_type.upper())
    if risk_level:
        if risk_level.upper() not in {"LOW", "CAUTION", "HIGH", "CRITICAL"}:
            raise HTTPException(422, "Unsupported risk level filter.")
        scan_query = scan_query.filter(Scan.risk_level == risk_level.upper())
    if saved_only:
        scan_query = scan_query.filter(Scan.is_saved.is_(True))
    if query:
        escaped_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        term = f"%{escaped_query}%"
        scan_query = scan_query.filter((Scan.content.ilike(term, escape="\\")) | (Scan.public_id.ilike(term, escape="\\")))
    if date_from:
        scan_query = scan_query.filter(Scan.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        scan_query = scan_query.filter(Scan.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc))
    total = scan_query.count()
    scans = scan_query.options(selectinload(Scan.evidence)).order_by(desc(Scan.created_at)).offset(offset).limit(limit).all()
    return {"success": True, "data": {"items": [_scan_payload(scan) for scan in scans], "total": total, "limit": limit, "offset": offset}, "request_id": str(uuid.uuid4())}


@router.get("/scans/{public_id}")
def get_scan(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).options(selectinload(Scan.evidence)).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found.")
    return {"success": True, "data": _scan_payload(scan), "request_id": str(uuid.uuid4())}


@router.delete("/scans/{public_id}")
def delete_scan(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found.")
    _audit(db, user.id, "scan.deleted", public_id)
    db.delete(scan)
    db.commit()
    return {"success": True, "data": {"deleted": True}, "request_id": str(uuid.uuid4())}


@router.post("/scans/{public_id}/save")
def save_scan(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found.")
    scan.is_saved = not scan.is_saved
    _audit(db, user.id, "scan.saved" if scan.is_saved else "scan.unsaved", public_id)
    db.commit()
    return {"success": True, "data": {"saved": scan.is_saved}, "request_id": str(uuid.uuid4())}


@router.post("/reports/{public_id}/share")
def share_scan(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found.")
    if not scan.share_token:
        scan.share_token = secrets.token_urlsafe(24)
    _audit(db, user.id, "report.shared", public_id)
    db.commit()
    return {"success": True, "data": {"share_id": scan.share_token, "url": f"{settings.frontend_url}/proof/{scan.share_token}", "privacy_notice": "Shared reports include the assessment and evidence, but not the submitted content."}, "request_id": str(uuid.uuid4())}


@router.delete("/reports/{public_id}/share")
def revoke_share(public_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    scan = db.query(Scan).filter_by(public_id=public_id, user_id=user.id).first()
    if not scan:
        raise HTTPException(404, "Scan not found.")
    scan.share_token = None
    _audit(db, user.id, "report.share_revoked", public_id)
    db.commit()
    return {"success": True, "data": {"revoked": True}, "request_id": str(uuid.uuid4())}


@router.get("/public/reports/{share_id}")
def public_report(share_id: str, db: Session = Depends(get_db)):
    scan = db.query(Scan).options(selectinload(Scan.evidence)).filter_by(share_token=share_id).first()
    if not scan:
        raise HTTPException(404, "Shared report not found or revoked.")
    # Deliberately omit input text, email, filenames and extracted personal data.
    report = _provider_safe_export(scan)
    return {"success": True, "data": report, "request_id": str(uuid.uuid4())}
