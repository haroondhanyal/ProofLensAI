from app.analyzers.message_analyzer import analyze_message
from app.analyzers.url_analyzer import analyze_url
from app.services.risk_engine import score_findings


def test_malformed_url_rejected():
    try:
        analyze_url("file:///etc/passwd")
    except ValueError:
        return
    assert False, "non-http URL must be rejected"


def test_plain_http_produces_security_signal():
    _, findings, _, _ = analyze_url("http://example.com")
    assert any(item.evidence_type == "no_https" for item in findings)


def test_private_destination_is_flagged_without_being_fetched():
    _, findings, level, _ = analyze_url("http://127.0.0.1:8080/admin")
    assert any(item.evidence_type == "private_destination" for item in findings)
    assert level in {"HIGH", "CRITICAL"}


def test_message_extracts_nested_url_signals():
    findings, _, _ = analyze_message("Your account will be suspended today. Verify at http://example-login.xyz")
    assert any("Link:" in item.title for item in findings)
    assert any("Urgency" in item.title for item in findings)


def test_risk_and_confidence_are_separate():
    _, level, confidence = score_findings([])
    assert level == "LOW"
    assert confidence == "LOW"
