import re
from app.analyzers.url_analyzer import analyze_url
from app.services.risk_engine import Finding, score_findings

PATTERNS = [
    ("Urgency or fear language", r"\b(urgent|immediately|today|within\s+\d+\s*(hour|minute)|suspend(ed|ion)?|blocked|last warning|act now)\b", "MEDIUM", 20),
    ("Credential or one-time code request", r"\b(otp|one[- ]time password|pin|password|passcode|verification code|login details)\b", "HIGH", 30),
    ("Payment or prize language", r"\b(prize|lottery|refund|fee|payment|transfer|crypto|investment|claim your)\b", "MEDIUM", 18),
    ("Impersonation wording", r"\b(bank|courier|government|tax office|support team|account team)\b", "LOW", 10),
]
URL_RE = re.compile(r"https?://[^\s<>\]\[()]+|(?:www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s<>\]\[()]*)?")


def analyze_message(text: str) -> tuple[list[Finding], str, list[str]]:
    findings: list[Finding] = []
    lowered = text.lower()
    for title, pattern, severity, weight in PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            findings.append(Finding(title, "A matching phrase was found in the submitted message. Read it in context; this signal alone does not confirm fraud.", severity, "Message rules", "message_pattern", weight))
    urls = URL_RE.findall(text)
    if urls:
        findings.append(Finding("Link included in message", f"Found {len(urls)} website address(es); local URL checks were applied to each.", "MEDIUM", "Message rules", "embedded_url", 8))
        for url in urls[:5]:
            try:
                _, url_findings, _, _ = analyze_url(url.rstrip(".,!?"))
                for finding in url_findings:
                    if finding.severity != "INFO":
                        findings.append(Finding(f"Link: {finding.title}", finding.description, finding.severity, finding.source, finding.evidence_type, max(1, finding.weight // 2)))
            except ValueError:
                continue
    if not findings:
        findings.append(Finding("No common scam-language signals found", "Local phrase checks found no common warning patterns. This is not proof that the message is legitimate.", "INFO", "Message rules", "no_local_flags", 0))
    _, level, _ = score_findings(findings)
    summary = "The message contains multiple common scam indicators. Do not follow its instructions until you verify the sender independently." if level in {"HIGH", "CRITICAL"} else "The message contains language that deserves caution. Confirm the sender through a separate, trusted channel." if level == "CAUTION" else "No major known scam-language signals were detected. This does not guarantee the message is genuine."
    actions = ["Do not reply with a password, PIN, or one-time code.", "Contact the organization using the number or app you already trust."] if level != "LOW" else ["Do not share sensitive information unless you verify the sender independently."]
    return findings, level, [summary, *actions]
