import re

from app.services.risk_engine import Finding


def analyze_claim(claim: str, organization: str | None = None, location: str | None = None) -> tuple[list[Finding], dict]:
    dates = re.findall(r"\b(?:today|tomorrow|yesterday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b", claim, re.I)
    entities = sorted(set(re.findall(r"\b[A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,2}\b", claim)))[:12]
    meta = {"claim": claim[:4000], "organization": organization, "location": location, "dates": dates, "entities": entities, "verdict": "INSUFFICIENT EVIDENCE", "sources": []}
    finding = Finding("No verified sources are connected", "ProofLens has no claim-source provider configured. This claim has not been independently verified, so no supported or refuted verdict is available.", "INFO", "Claim verification", "claim_insufficient_evidence", 0)
    return [finding], meta
