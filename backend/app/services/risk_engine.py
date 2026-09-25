from dataclasses import dataclass
from app.core.config import settings


@dataclass
class Finding:
    title: str
    description: str
    severity: str
    source: str
    evidence_type: str
    weight: int


def score_findings(findings: list[Finding]) -> tuple[int, str, str]:
    score = min(100, sum(max(0, item.weight) for item in findings))
    level = "LOW" if score < settings.risk_caution_threshold else "CAUTION" if score < settings.risk_high_threshold else "HIGH" if score < settings.risk_critical_threshold else "CRITICAL"
    active = [item for item in findings if item.weight > 0]
    confidence = "LOW" if len(active) < 2 else "MEDIUM" if len(active) < 4 else "HIGH"
    return score, level, confidence
