"""Static file inspection. Never extracts to disk or executes uploaded content."""
import hashlib
import io
import re
import zipfile
from pathlib import PurePath

from app.services.risk_engine import Finding

MAX_ZIP_MEMBERS = 2_000
MAX_METADATA_BYTES = 32 * 1024 * 1024
URL_PATTERN = re.compile(rb"https?://[^\s\x00\"'<>]{4,2048}", re.IGNORECASE)
MACRO_EXTENSIONS = {".docm", ".xlsm", ".pptm", ".dotm", ".xlam", ".ppsm"}
EXPECTED_MIME = {
    ".pdf": {"application/pdf"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    ".zip": {"application/zip", "application/x-zip-compressed"},
    ".txt": {"text/plain"}, ".md": {"text/markdown", "text/plain"}, ".csv": {"text/csv", "application/vnd.ms-excel"},
    ".exe": {"application/vnd.microsoft.portable-executable", "application/x-msdownload"},
    ".dll": {"application/vnd.microsoft.portable-executable", "application/x-msdownload"},
}
SIGNATURES = {
    ".pdf": (b"%PDF-",), ".zip": (b"PK\x03\x04", b"PK\x05\x06"),
    ".docx": (b"PK\x03\x04",), ".xlsx": (b"PK\x03\x04",), ".pptx": (b"PK\x03\x04",),
    ".exe": (b"MZ",), ".dll": (b"MZ",), ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",), ".jpeg": (b"\xff\xd8\xff",),
}


def inspect_file(filename: str, mime_type: str | None, blob: bytes) -> dict:
    suffix = PurePath(filename).suffix.lower()
    digest = hashlib.sha256(blob).hexdigest()
    findings: list[Finding] = []
    if not blob:
        raise ValueError("The selected file is empty.")
    if len(blob) > MAX_METADATA_BYTES:
        raise ValueError("The selected file exceeds the inspection limit.")
    signatures = SIGNATURES.get(suffix)
    signature_matches = any(blob.startswith(signature) for signature in signatures) if signatures else None
    if signature_matches is False:
        findings.append(Finding("File extension and signature differ", "The file's initial bytes do not match its extension. Treat it cautiously; this alone does not prove it is malicious.", "MEDIUM", "File signature inspection", "extension_mismatch", 20))
    normalized_mime = (mime_type or "").split(";", 1)[0].strip().lower()
    if suffix in EXPECTED_MIME and normalized_mime not in EXPECTED_MIME[suffix] | {"application/octet-stream", ""}:
        findings.append(Finding("Declared MIME type differs from extension", "The upload's declared content type does not match its filename extension. This can be caused by a client configuration issue and is not by itself proof of malicious content.", "LOW", "MIME metadata inspection", "mime_mismatch", 8))
    if suffix in MACRO_EXTENSIONS:
        findings.append(Finding("Macro-capable Office format", "This extension can contain macros. ProofLens does not execute the file or determine whether any macro is malicious.", "MEDIUM", "File metadata inspection", "macro_capable", 12))
    lower_name = PurePath(filename).name.lower()
    if re.search(r"\.(pdf|docx?|xlsx?|pptx?|txt)\.(exe|scr|bat|cmd|js|vbs)$", lower_name):
        findings.append(Finding("Double extension in filename", "The filename ends in an executable-like extension after a document extension.", "HIGH", "Filename inspection", "double_extension", 25))
    urls = sorted({match.decode("utf-8", "ignore").rstrip(".,);]") for match in URL_PATTERN.findall(blob)})[:20]
    if urls:
        findings.append(Finding("Embedded web addresses found", f"Static inspection found {len(urls)} web address(es). They were not opened.", "INFO", "File content inspection", "embedded_urls", 0))
    archive: dict | None = None
    if zipfile.is_zipfile(io.BytesIO(blob)):
        try:
            with zipfile.ZipFile(io.BytesIO(blob)) as container:
                members = container.infolist()[:MAX_ZIP_MEMBERS]
                names = [member.filename for member in members]
                macro_members = [name for name in names if name.lower().endswith("vbaproject.bin")]
                suspicious_paths = [name for name in names if name.startswith(("/", "\\")) or ".." in PurePath(name).parts]
                archive = {"member_count": len(members), "truncated": len(container.infolist()) > MAX_ZIP_MEMBERS, "macro_project_present": bool(macro_members)}
                if macro_members:
                    findings.append(Finding("Embedded Office macro project", "An archive member named vbaProject.bin was found. Its contents were not executed or analyzed.", "MEDIUM", "Archive metadata inspection", "macro_project_present", 18))
                if suspicious_paths:
                    findings.append(Finding("Unsafe archive paths", "Archive member names include absolute or parent-directory paths. No member was extracted.", "MEDIUM", "Archive metadata inspection", "unsafe_archive_path", 16))
        except (OSError, zipfile.BadZipFile):
            findings.append(Finding("Archive metadata incomplete", "The archive could not be safely listed; no files were extracted.", "INFO", "Archive metadata inspection", "archive_incomplete", 0))
    if not findings:
        findings.append(Finding("No known static warning signals", "Basic metadata and signature inspection found no listed warning. The file was not executed, and this is not an antivirus clearance.", "INFO", "Local file inspection", "no_static_warnings", 0))
    return {"sha256": digest, "size_bytes": len(blob), "filename": PurePath(filename).name[:255], "declared_mime_type": (mime_type or "application/octet-stream")[:128], "extension": suffix, "signature_match": signature_matches, "embedded_urls": urls, "archive": archive, "findings": findings}
