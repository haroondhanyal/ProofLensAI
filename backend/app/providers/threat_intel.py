"""Optional threat feed lookups. No result is fabricated when credentials are absent."""
from urllib.parse import urlsplit, urlunsplit

import httpx

from app.core.config import settings
from app.services.risk_engine import Finding


def check_url_feeds(url: str) -> tuple[list[Finding], dict[str, str]]:
    findings: list[Finding] = []
    status: dict[str, str] = {}
    if not settings.web_risk_api_key:
        status["google_web_risk"] = "not_configured"
        return findings, status
    try:
        candidate = url if "://" in url else f"https://{url}"
        try:
            parsed = urlsplit(candidate)
        except ValueError:
            status["google_web_risk"] = "unavailable"
            return findings, status
        host = parsed.hostname or ""
        if ":" in host:
            host = f"[{host}]"
        try:
            port = f":{parsed.port}" if parsed.port else ""
        except ValueError:
            port = ""
        # Never send URL-embedded credentials or fragments to an external reputation feed.
        candidate = urlunsplit((parsed.scheme, f"{host}{port}", parsed.path, parsed.query, ""))
        response = httpx.get(
            "https://webrisk.googleapis.com/v1/uris:search",
            params={"threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"], "uri": candidate, "key": settings.web_risk_api_key},
            timeout=httpx.Timeout(4.0, connect=2.0),
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            status["google_web_risk"] = "unavailable"
            return findings, status
        threat = data.get("threat")
        status["google_web_risk"] = "match" if threat else "no_match"
        if threat:
            types = ", ".join(threat.get("threatTypes", [])) or "unsafe URL"
            findings.append(Finding("Threat feed match", f"Google Web Risk lists this address as {types}. This provider's list can contain errors and may not include every unsafe address.", "HIGH", "Google Web Risk", "threat_feed_match", 38))
    except (httpx.HTTPError, ValueError):
        status["google_web_risk"] = "unavailable"
    return findings, status
