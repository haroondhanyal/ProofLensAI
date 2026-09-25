"""Optional AV/YARA and media provider adapters. Disabled integrations stay explicit."""
import re
import shutil
import subprocess

from app.core.config import settings


_LOCAL_FILE_RULES = (
    ("EICAR antivirus test string (not malware)", re.compile(rb"X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*"), "INFO"),
    ("PowerShell encoded command", re.compile(rb"(?i)(?:powershell|pwsh)(?:\.exe)?[^\r\n]{0,120}-(?:enc|encodedcommand)\b"), "MEDIUM"),
    ("Script downloads and executes remote content", re.compile(rb"(?i)(?:downloadstring|downloadfile|urlmon|urlmon\.dll|bitsadmin)[^\r\n]{0,180}(?:http|https)://"), "MEDIUM"),
    ("Office auto-run macro marker", re.compile(rb"(?i)(?:autoopen|document_open|workbook_open)[^\r\n]{0,200}(?:shell|createobject|powershell|wscript)"), "MEDIUM"),
    ("Obfuscated JavaScript execution marker", re.compile(rb"(?i)(?:eval\s*\(\s*atob|fromcharcode\s*\([^)]{80,})"), "LOW"),
)


def scan_with_local_signatures(blob: bytes) -> dict:
    """Cheap, always-available byte-pattern triage. This is not antivirus."""
    matches = [name for name, pattern, _ in _LOCAL_FILE_RULES if pattern.search(blob)]
    return {"status": "complete", "scanner": "ProofLens local static signatures", "matches": matches,
            "severities": {name: severity for name, _, severity in _LOCAL_FILE_RULES if name in matches}}


def scan_with_yara(blob: bytes) -> dict:
    if not settings.yara_rules_path:
        return {"status": "not_configured", "matches": []}
    try:
        import yara
        rules = yara.compile(filepath=settings.yara_rules_path)
        return {"status": "complete", "matches": [match.rule for match in rules.match(data=blob)]}
    except ImportError:
        return {"status": "unavailable", "matches": [], "detail": "Install yara-python to enable configured rules."}
    except Exception as exc:
        return {"status": "unavailable", "matches": [], "detail": f"Rules could not be loaded ({type(exc).__name__})."}


def scan_with_antivirus(blob: bytes) -> dict:
    if not settings.antivirus_socket and not settings.antivirus_host:
        return _scan_with_clamscan(blob)
    import socket
    import struct
    if settings.antivirus_host:
        import ipaddress
        try:
            if not ipaddress.ip_address(settings.antivirus_host).is_loopback:
                return {"status": "unavailable", "scanner": "ClamAV", "detail": "TCP scanner must use a loopback address."}
        except ValueError:
            return {"status": "unavailable", "scanner": "ClamAV", "detail": "TCP scanner host must be a loopback IP address."}
        address = (settings.antivirus_host, settings.antivirus_port)
        client = socket.socket(socket.AF_INET6 if ":" in settings.antivirus_host else socket.AF_INET, socket.SOCK_STREAM)
        connect_address = address
    else:
        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        connect_address = settings.antivirus_socket
    client.settimeout(30.0)
    try:
        client.connect(connect_address)
        client.sendall(b"zINSTREAM\0")
        for offset in range(0, len(blob), 64 * 1024):
            chunk = blob[offset:offset + 64 * 1024]
            client.sendall(struct.pack("!I", len(chunk)) + chunk)
        client.sendall(struct.pack("!I", 0))
        response = client.recv(4096).decode("utf-8", "replace").strip().rstrip("\0")
        if response.endswith(" OK"):
            return {"status": "clean", "scanner": "ClamAV"}
        if response.endswith(" FOUND"):
            return {"status": "match", "scanner": "ClamAV", "signature": response.split(":", 1)[-1].replace(" FOUND", "")[:160]}
        return {"status": "unavailable", "scanner": "ClamAV", "detail": "Scanner returned an unrecognized response."}
    except OSError:
        fallback = _scan_with_clamscan(blob)
        if fallback["status"] not in {"not_configured", "unavailable"}:
            return fallback
        return {"status": "unavailable", "scanner": "ClamAV", "detail": "Scanner socket was unreachable and no working local clamscan fallback was available."}
    finally:
        client.close()


def _scan_with_clamscan(blob: bytes) -> dict:
    """Use a local clamscan executable over stdin when the daemon is not available."""
    binary = shutil.which(settings.antivirus_binary or "clamscan")
    if not binary:
        return {"status": "not_configured"}
    try:
        result = subprocess.run([binary, "--no-summary", "-"], input=blob, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=60, check=False)
    except subprocess.TimeoutExpired:
        return {"status": "unavailable", "scanner": "ClamAV clamscan", "detail": "Local one-shot scan timed out."}
    except OSError:
        return {"status": "unavailable", "scanner": "ClamAV clamscan", "detail": "Local clamscan could not be started."}
    output = result.stdout.decode("utf-8", "replace")[-1000:]
    if result.returncode == 0 and re.search(r":\s+OK\s*$", output, re.M):
        return {"status": "clean", "scanner": "ClamAV clamscan"}
    if result.returncode == 1 and (match := re.search(r"^.*?:\s*(.*?)\s+FOUND\s*$", output, re.M)):
        return {"status": "match", "scanner": "ClamAV clamscan", "signature": match.group(1)[:160]}
    return {"status": "unavailable", "scanner": "ClamAV clamscan", "detail": "Local signature database is missing or the scanner returned an error."}


def analyze_media(blob: bytes, filename: str, mime_type: str) -> dict:
    if not settings.media_provider_url or not settings.media_provider_api_key:
        return {"status": "not_configured", "ai_generated": None, "deepfake": None, "provenance": None}
    import httpx
    if not settings.media_provider_url.startswith("https://"):
        return {"status": "unavailable", "ai_generated": None, "deepfake": None, "provenance": None}
    try:
        response = httpx.post(
            settings.media_provider_url,
            headers={"Authorization": f"Bearer {settings.media_provider_api_key}"},
            files={"file": (filename, blob, mime_type)},
            timeout=httpx.Timeout(12.0, connect=3.0),
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            return {"status": "unavailable", "ai_generated": None, "deepfake": None, "provenance": None}
        # Accept only the documented adapter envelope and never derive risk directly from provider scores.
        return {"status": "complete", "ai_generated": data.get("ai_generated") if isinstance(data.get("ai_generated"), dict) else None, "deepfake": data.get("deepfake") if isinstance(data.get("deepfake"), dict) else None, "provenance": data.get("provenance") if isinstance(data.get("provenance"), dict) else None, "provider": str(data.get("provider", "configured media provider"))[:100]}
    except (httpx.HTTPError, ValueError):
        return {"status": "unavailable", "ai_generated": None, "deepfake": None, "provenance": None}
