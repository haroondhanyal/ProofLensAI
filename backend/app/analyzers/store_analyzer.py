import re
from urllib.parse import urlsplit

from app.analyzers.url_analyzer import analyze_url
from app.services.risk_engine import Finding
from app.services.safe_fetch import fetch_public_page


def analyze_store(url: str, context: str = "", fetch_page: bool = False) -> tuple[list[Finding], dict]:
    host, findings, _, _ = analyze_url(url)
    store_findings = [item for item in findings if item.weight > 0]
    parsed = urlsplit(url if "://" in url else f"https://{url}")
    if parsed.scheme.lower() != "https":
        store_findings.append(Finding("Store URL does not use HTTPS", "The submitted address is not protected by HTTPS. Avoid entering sensitive information on it.", "MEDIUM", "Store URL inspection", "store_no_https", 16))
    fetched_text = ""
    fetch_status = "not_requested"
    fetched_links = []
    social_hosts = set()
    page_forms = []
    company_info = False
    if fetch_page:
        page = fetch_public_page(url if "://" in url else f"https://{url}")
        fetch_status = page.get("status", "unavailable")
        if fetch_status == "fetched":
            fetched_text = page.get("text", "")
            page_forms = page.get("forms", [])
            social_suffixes = ("facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "pinterest.com")
            for link in page.get("links", []):
                link_host = (urlsplit(link.get("href", "")).hostname or "").lower()
                if any(link_host == domain or link_host.endswith("." + domain) for domain in social_suffixes):
                    social_hosts.add(link_host)
            hints = ("contact", "about", "return", "refund", "privacy", "terms", "policy")
            for link in page.get("links", []):
                if len(fetched_links) >= 2: break
                marker = (link.get("href", "") + " " + link.get("text", "")).lower()
                if not any(hint in marker for hint in hints): continue
                from urllib.parse import urljoin, urlsplit
                candidate = urljoin(page["final_url"], link.get("href", ""))
                if urlsplit(candidate).hostname == page.get("hostname"):
                    extra = fetch_public_page(candidate)
                    if extra.get("status") == "fetched":
                        fetched_links.append(extra.get("final_url"))
                        fetched_text += " " + extra.get("text", "")
    submitted = " ".join((context, fetched_text)).strip()
    if submitted:
        lowered = submitted.lower()
        if any(word in lowered for word in ("limited time", "act now", "only today", "last chance", "hurry")):
            store_findings.append(Finding("Urgency language in store details", "Reviewed details use time-pressure wording. This is a signal to review, not proof of fraud.", "LOW", "Fetched store page" if fetched_text else "Submitted store details", "store_urgency", 8))
        for label, terms in (("Contact information wording", ("contact us", "customer service", "support email")), ("Returns or refund policy wording", ("refund", "returns policy", "return policy"))):
            if any(term in lowered for term in terms):
                store_findings.append(Finding(label + (" found on fetched page" if fetched_text else " present in pasted text"), "Related wording appears in reviewed page text. ProofLens has not verified whether the information is genuine or complete.", "INFO", "Fetched store page" if fetched_text else "Submitted store details", "store_text_presence", 0))
        if re.search(r"\b(?:wire transfer|gift card|crypto only|friends and family)\b", lowered):
            store_findings.append(Finding("Unusual payment wording on store", "Reviewed text mentions payment methods that may limit recourse. Independently verify the seller and terms.", "MEDIUM", "Fetched store page" if fetched_text else "Submitted store details", "unusual_payment_terms", 18))
        if re.search(r"\b(?:8[5-9]|9\d|100)\s*%\s*(?:off|discount)\b", lowered):
            store_findings.append(Finding("Very large advertised discount", "Reviewed text advertises at least 85% off. The offer and reference price were not independently verified.", "MEDIUM", "Fetched store page" if fetched_text else "Submitted store details", "extreme_discount", 14))
        company_info = bool(re.search(r"\b(?:company registration|registered company|business registration|company number|VAT number|tax ID|business address)\b", lowered))
        if re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", submitted, re.I) or re.search(r"\+?\d[\d\s().-]{7,}\d", submitted):
            store_findings.append(Finding("Contact detail appears in reviewed store text", "An email address or phone-like number appears on the reviewed page/text. ProofLens has not verified ownership or whether it works.", "INFO", "Fetched store page" if fetched_text else "Submitted store details", "store_contact_detail", 0))
        if company_info:
            store_findings.append(Finding("Business-registration wording appears", "The page mentions company or tax registration details. ProofLens has not verified the registration against an official registry.", "INFO", "Fetched store page" if fetched_text else "Submitted store details", "store_company_info", 0))
        if social_hosts:
            store_findings.append(Finding("Social-media links found", f"The store links to {len(social_hosts)} social-media domain(s). Link presence does not verify that the accounts belong to the seller.", "INFO", "Fetched store page", "store_social_links", 0))
        fields = " ".join(field for form in page_forms for field in form.get("fields", [])).lower()
        if any(marker in fields for marker in ("cc-number", "credit-card", "cardnumber", "payment")):
            store_findings.append(Finding("Checkout/payment form indicators found", "A form includes fields associated with payment. ProofLens did not submit the form or assess the payment processor.", "INFO", "Fetched store page", "store_checkout_form", 0))
    if not store_findings:
        store_findings.append(Finding("No major store warning found", "Available address and text checks found no major warning. The seller and business details are not authenticated.", "INFO", "Local store checks", "store_content_not_fetched", 0))
    return store_findings, {"hostname": host, "https": parsed.scheme.lower() == "https", "website_content_fetched": bool(fetched_text), "fetch_status": fetch_status, "additional_pages_fetched": len(fetched_links), "social_domains_found": len(social_hosts), "company_info_wording_found": company_info}


def analyze_product(url: str | None, description: str, price: float | None, reference_price: float | None, fetch_page: bool = False) -> tuple[list[Finding], dict]:
    findings: list[Finding] = []
    meta: dict = {"website_content_fetched": False, "price": price, "reference_price": reference_price, "fetch_status": "not_requested"}
    if url:
        _, url_findings, _, _ = analyze_url(url)
        findings.extend(item for item in url_findings if item.weight > 0)
        meta["url_submitted"] = True
        if fetch_page:
            page = fetch_public_page(url)
            meta["fetch_status"] = page.get("status")
            if page.get("status") == "fetched":
                meta["website_content_fetched"] = True
                description = (description + " " + page.get("text", ""))[:8000]
    text = description.lower()
    if any(word in text for word in ("guaranteed authentic", "100% genuine", "original replica", "limited stock", "buy now")):
        findings.append(Finding("Promotional or authenticity claims need verification", "The submitted listing uses strong authenticity or urgency wording. These claims were not independently verified.", "LOW", "Submitted listing description", "listing_claims", 8))
    if re.search(r"\b(?:only\s+\d+\s+left|selling fast|last chance|act now|limited stock)\b", text):
        findings.append(Finding("Urgency wording in product listing", "The listing uses scarcity or time-pressure wording. This is a review signal, not proof of fraud.", "LOW", "Submitted or fetched listing text", "listing_urgency", 6))
    if re.search(r"\b(?:five[- ]star|5[- ]star|verified reviews|thousands of reviews)\b", text):
        findings.append(Finding("Review-promotion wording needs independent checking", "The listing makes review or rating claims. ProofLens has not retrieved or authenticated any reviews.", "INFO", "Submitted or fetched listing text", "listing_review_claim", 0))
    if price is not None and reference_price and reference_price > 0 and price < reference_price * 0.35:
        findings.append(Finding("Large stated discount", "The submitted price is less than 35% of the reference price you entered. The reference price itself was not verified.", "MEDIUM", "User-provided prices", "large_discount", 12))
    if not findings:
        findings.append(Finding("Insufficient listing evidence", "No notable signal was found in the supplied text and prices. The seller, reviews, and physical product were not verified.", "INFO", "Local listing checks", "listing_insufficient_evidence", 0))
    return findings, meta
