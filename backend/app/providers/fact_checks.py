"""Google Fact Check Tools adapter. Source ratings remain attributed to publishers."""
import httpx

from app.core.config import settings


def search_fact_checks(query: str) -> dict:
    if not settings.fact_check_api_key:
        return {"status": "not_configured", "sources": [], "verdict": "INSUFFICIENT EVIDENCE"}
    try:
        response = httpx.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": query[:1000], "pageSize": 10, "key": settings.fact_check_api_key}, timeout=6,
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError):
        return {"status": "unavailable", "sources": [], "verdict": "INSUFFICIENT EVIDENCE"}
    sources = []
    for claim in data.get("claims", []):
        for review in claim.get("claimReview", []):
            url = review.get("url", "")
            if not url.startswith("https://"):
                continue
            sources.append({"publisher": (review.get("publisher") or {}).get("name", "Fact-check publisher")[:200],
                            "url": url[:2048], "title": review.get("title", "")[:500],
                            "review_date": review.get("reviewDate", "")[:40],
                            "rating": review.get("textualRating", "")[:200],
                            "claim_text": claim.get("text", "")[:1000]})
            if len(sources) >= 20: break
        if len(sources) >= 20: break
    labels = []
    for item in sources:
        rating = item["rating"].lower()
        if any(word in rating for word in ("false", "incorrect", "misleading", "fake", "pants on fire")):
            labels.append("NOT_SUPPORTED")
        elif any(word in rating for word in ("true", "correct", "accurate")) and not any(word in rating for word in ("not true", "mostly false", "partly true", "half true")):
            labels.append("SUPPORTED")
        elif any(word in rating for word in ("half true", "partly true", "mixed", "partially")):
            labels.append("CONFLICTING")
    verdict = "INSUFFICIENT EVIDENCE"
    if "SUPPORTED" in labels and "NOT_SUPPORTED" in labels:
        verdict = "CONFLICTING"
    elif labels.count("SUPPORTED") >= 2 and "NOT_SUPPORTED" not in labels:
        verdict = "SUPPORTED"
    elif labels.count("NOT_SUPPORTED") >= 2 and "SUPPORTED" not in labels:
        verdict = "NOT SUPPORTED"
    elif labels.count("CONFLICTING") >= 2:
        verdict = "CONFLICTING"
    return {"status": "available", "sources": sources, "verdict": verdict}
