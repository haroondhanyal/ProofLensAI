import ipaddress
import re
from urllib.parse import urlsplit

from app.services.risk_engine import Finding, score_findings

SUSPICIOUS_WORDS = ("login", "verify", "secure", "account", "update", "wallet", "payment", "claim", "prize")
KNOWN_BRANDS = ("paypal", "microsoft", "apple", "amazon", "google", "facebook", "instagram", "netflix", "whatsapp", "coinbase", "binance", "dropbox", "outlook")
MULTI_LABEL_SUFFIXES = {"co.uk", "org.uk", "ac.uk", "com.au", "net.au", "com.pk", "co.nz", "co.jp", "com.br", "co.in", "com.sg", "com.my", "com.tr", "co.za"}


def _edit_distance_at_most_one(first: str, second: str) -> bool:
    if abs(len(first) - len(second)) > 1:
        return False
    i = j = differences = 0
    while i < len(first) and j < len(second):
        if first[i] == second[j]:
            i += 1; j += 1
        else:
            differences += 1
            if differences > 1: return False
            if len(first) >= len(second): i += 1
            if len(second) >= len(first): j += 1
    return differences + (i < len(first) or j < len(second)) <= 1


def _lookalike_brand(host: str) -> str | None:
    labels = [label for label in host.split(".") if label and label != "www"]
    if len(labels) < 2: return None
    suffix = ".".join(labels[-2:])
    base_index = -3 if suffix in MULTI_LABEL_SUFFIXES and len(labels) >= 3 else -2
    base = labels[base_index].replace("-", "")
    # Brand in a subdomain of an unrelated registrable domain is also a common disguise.
    for brand in KNOWN_BRANDS:
        if brand in labels[:base_index if base_index != -2 else -1] and base != brand:
            return brand
    normalized = base.translate(str.maketrans({"0": "o", "1": "l", "3": "e", "5": "s", "8": "b"}))
    for brand in KNOWN_BRANDS:
        if base != brand and (brand in normalized or _edit_distance_at_most_one(normalized, brand)):
            return brand
    return None


def analyze_url(value: str) -> tuple[str, list[Finding], str, list[str]]:
    raw = value.strip()
    candidate = raw if "://" in raw else f"https://{raw}"
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Please enter a valid http or https website address.")
    host = parsed.hostname.rstrip(".").lower()
    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Please enter a valid website address.") from exc
    if len(raw) > 120:
        findings = [Finding("Unusually long address", "Long URLs can obscure their destination; inspect the full address carefully.", "LOW", "URL rules", "url_length", 8)]
    else:
        findings = []
    try:
        address = ipaddress.ip_address(host)
        findings.append(Finding("Website uses a raw IP address", "The address points directly to an IP instead of a recognizable domain.", "MEDIUM", "URL rules", "ip_hostname", 24))
        if not address.is_global:
            findings.append(Finding("Address points to a private or reserved network", "This destination is not a public website address. ProofLens does not connect to it.", "HIGH", "URL rules", "private_destination", 55))
    except ValueError:
        if host in {"localhost", "localhost.localdomain"} or host.endswith((".localhost", ".local", ".internal")) or "." not in host:
            findings.append(Finding("Internal hostname detected", "This name commonly refers to a local or private network host. ProofLens does not connect to it.", "HIGH", "URL rules", "private_destination", 55))
    if parsed.scheme != "https":
        findings.append(Finding("Connection does not use HTTPS", "Information sent to this site may not be encrypted in transit.", "MEDIUM", "URL rules", "no_https", 18))
    if host.startswith("xn--") or ".xn--" in host:
        findings.append(Finding("Internationalized domain encoding detected", "Encoded domain characters can make a look-alike address harder to recognize.", "MEDIUM", "URL rules", "punycode", 22))
    brand = _lookalike_brand(host)
    if brand:
        findings.append(Finding("Possible brand-lookalike hostname", f"The hostname resembles or embeds the brand name {brand.title()} outside its normal domain position. This local pattern is a warning, not proof of impersonation.", "MEDIUM", "Local hostname rules", "brand_lookalike", 18))
    if host.count("-") >= 3 or host.count(".") >= 4:
        findings.append(Finding("Unusually complex hostname", "Several separators or subdomains can make the destination harder to identify.", "LOW", "URL rules", "complex_host", 10))
    if port not in {None, 80, 443}:
        findings.append(Finding("Non-standard website port", "The URL uses a port that is less commonly used for public websites.", "LOW", "URL rules", "unusual_port", 10))
    if re.search(r"@|%40", raw):
        findings.append(Finding("Address contains an @ character", "Some URLs use @ to disguise which host the browser will actually open.", "MEDIUM", "URL rules", "at_sign", 20))
    if any(word in (host + parsed.path).lower() for word in SUSPICIOUS_WORDS):
        findings.append(Finding("Sensitive-action wording in address", "The address contains wording often used around sign-ins or payments; this alone does not prove abuse.", "LOW", "URL rules", "sensitive_word", 8))
    if not findings:
        findings.append(Finding("No local URL warning signals found", "Basic address checks found no obvious warning patterns. This does not guarantee that the address is safe.", "INFO", "URL rules", "no_local_flags", 0))
    risk, level, _ = score_findings(findings)
    summary = "Local checks found several warning signals. Avoid interacting until you verify the destination independently." if level in {"HIGH", "CRITICAL"} else "Some caution signals were found. Check the destination through an official channel before sharing sensitive information." if level == "CAUTION" else "No major known threat indicators were found by the local checks. This does not guarantee that the site is safe."
    actions = ["Do not enter passwords, one-time codes, or payment details unless you independently verify the site.", "Open the organization's official app or type its known address yourself."] if level != "LOW" else ["Continue using normal security precautions.", "For sensitive actions, reach the organization through its official app or website."]
    return host, findings, level, [summary, *actions]
