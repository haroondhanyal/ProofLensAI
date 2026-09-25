import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

from app.db.session import Base, get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


def register(client: TestClient):
    response = client.post("/api/v1/auth/register", json={"email":"tester@example.com","password":"a-very-long-test-password","display_name":"Tester"})
    assert response.status_code == 201
    assert "httponly" in response.headers["set-cookie"].lower()


def test_cookie_auth_and_url_scan_history(client):
    register(client)
    response = client.post("/api/v1/analyze/url", json={"content":"http://example.com/login"})
    assert response.status_code == 200
    result = response.json()["data"]
    assert result["scan_id"].startswith("PL-")
    assert result["evidence"]
    history = client.get("/api/v1/scans")
    assert history.json()["data"]["total"] == 1
    assert history.json()["data"]["items"][0]["scan_id"] == result["scan_id"]


def test_history_filters_search_and_pagination(client):
    register(client)
    client.post("/api/v1/analyze/url", json={"content":"http://example.com/login"})
    client.post("/api/v1/analyze/message", json={"content":"Your account will be suspended; verify now"})
    filtered = client.get("/api/v1/scans", params={"scan_type":"MESSAGE", "query":"suspended"}).json()["data"]
    assert filtered["total"] == 1
    assert filtered["items"][0]["scan_type"] == "MESSAGE"


def test_share_report_excludes_input_and_private_image_metadata(client):
    register(client)
    image = Image.new("RGB", (24, 24), "white")
    image_buffer = io.BytesIO()
    image.save(image_buffer, format="PNG")
    response = client.post("/api/v1/analyze/screenshot", files={"file":("private.png",image_buffer.getvalue(),"image/png")})
    assert response.status_code == 200
    scan = response.json()["data"]
    share = client.post(f"/api/v1/reports/{scan['scan_id']}/share").json()["data"]
    public = client.get(f"/api/v1/public/reports/{share['share_id']}").json()["data"]
    assert "analysis_meta" not in public
    assert "content" not in public


def test_authentication_required_for_scans(client):
    response = client.get("/api/v1/scans")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_refresh_rotates_http_only_sessions(client):
    register(client)
    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert "refreshed" in refreshed.json()["data"]
    assert client.get("/api/v1/auth/me").status_code == 200


def test_forgot_password_never_confirms_account_existence(client):
    response = client.post("/api/v1/auth/forgot-password", json={"email":"nobody@example.com"})
    assert response.status_code == 200
    assert "If the account exists" in response.json()["data"]["message"]
    assert "token" not in response.json()["data"]


def test_account_delete_requires_password_and_removes_owned_scans(client):
    register(client)
    scan = client.post("/api/v1/analyze/url", json={"content":"http://example.com"}).json()["data"]
    denied = client.request("DELETE", "/api/v1/auth/me", json={"password":"incorrect-password"})
    assert denied.status_code == 401
    deleted = client.request("DELETE", "/api/v1/auth/me", json={"password":"a-very-long-test-password"})
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/scans/{scan['scan_id']}").status_code == 401
