# Phase 2 provider integrations

All providers are opt-in. With missing keys, a timeout, or an invalid response, the report records `not_configured` or `unavailable`; it does not invent a match, probability, verdict, or citation.

## Optional local message explanation

Install Ollama and pull a local model such as `qwen3:1.7b`, then set `LOCAL_AI_URL=http://127.0.0.1:11434` and `LOCAL_AI_MODEL=qwen3:1.7b` in `.env` before starting FastAPI. Message scans call only a loopback Ollama endpoint. The model returns an advisory explanation shown separately from evidence; it cannot change findings, score, risk level, or recommendations. If Ollama is stopped or slow, the normal local message analysis still completes and its metadata reports `unavailable`. Submitted text is sent to the Ollama process on the same machine; it is not sent to a hosted model service by this integration. Disable it by clearing either setting.

## Google Web Risk

Set `WEB_RISK_API_KEY`. URL checks send the submitted URL to Google's Lookup API and request malware, social engineering, unwanted software, and potentially harmful application lists. URL-embedded credentials and fragments are removed before this request; the URL path and query are still sent. A provider match adds a separately attributed evidence item. A no-match is not a safety guarantee. Review provider terms and data handling before enabling this: submitted addresses can contain personal or confidential tokens. See [Google's Lookup API guide](https://docs.cloud.google.com/web-risk/docs/lookup-api).

Provider-restricted feed findings are removed and the exported score is recomputed for public share pages and PDF exports, in line with Web Risk's no-redistribution terms. The authenticated report view retains the full finding.

## File scanning

Static inspection runs locally and in memory. Supported suffixes are PDF, DOCX, XLSX, PPTX, ZIP, TXT, MD, CSV and selected executable metadata. It calculates SHA-256, compares known signatures with suffixes, finds visible HTTP(S) strings, lists ZIP members without extracting them, and flags macro-capable Office packages. Built-in byte-pattern triage runs without an external service or rules download and can flag the EICAR test string and several suspicious script/macro patterns. These small heuristics are not antivirus and cannot establish that a file is clean.

For ClamAV on macOS, `npm run clamav:host-install` installs it with Homebrew, creates active `freshclam.conf` and `clamd.conf` from Homebrew's samples, and updates signatures. It configures the daemon for loopback TCP at `127.0.0.1:3310`; start it with `/opt/homebrew/opt/clamav/sbin/clamd --foreground`. The API can also fall back to the local `clamscan` executable if the daemon is stopped. For Docker, run `npm run clamav:up`, set `ANTIVIRUS_HOST=127.0.0.1` and `ANTIVIRUS_PORT=3310` in the root `.env`, then restart FastAPI. The Docker service binds only to loopback and persists signature databases in a Docker volume; its first start needs internet access. `npm run clamav:logs` shows startup/update progress; `npm run clamav:down` stops it. On non-Docker daemon setups, configure `ANTIVIRUS_SOCKET` for a local Unix socket. YARA is separate: install `yara-python` and set `YARA_RULES_PATH` to an administrator-managed rules source.

## No-key local fallbacks

Local URL rules now also flag likely brand-lookalike hostnames for a small, explicit brand list. This is heuristic triage: it can miss lookalikes and can flag legitimate names, so the finding is cautious and low weight. Screenshot OCR uses the installed local Tesseract binary through `pytesseract`; on macOS, install Tesseract with `brew install tesseract` if it is missing. No image is sent to an OCR vendor.

The local checks continue when Google Web Risk, Google Fact Check Tools, YARA, ClamAV, or a media provider is not configured. For claim checking, no unkeyed substitute currently provides the same preserved fact-check review citations. ProofLens therefore leaves such claims at `INSUFFICIENT EVIDENCE`; users can verify claims using linked primary sources independently rather than receiving a fabricated verdict.

## Media authenticity provider contract

Set `MEDIA_PROVIDER_URL` to a trusted HTTPS endpoint and `MEDIA_PROVIDER_API_KEY`. ProofLens sends the selected image as multipart field `file` with a bearer token. The response contract is:

```json
{
  "provider": "Provider name",
  "ai_generated": { "label": "likely", "confidence": 0.82 },
  "deepfake": { "label": "uncertain", "confidence": 0.51 },
  "provenance": { "status": "not_found" }
}
```

Each result object is optional. Only a recognized positive `label` creates a low-weight, attributed evidence signal; a provider's score cannot set the ProofLens risk score directly. An absent credential produces no authenticity verdict. Lack of EXIF or C2PA metadata is not evidence that an image is fake.

Image scans retain selected EXIF fields (capture/edit time, camera make/model, and software) while excluding GPS coordinates. A possible C2PA/content-credentials marker is surfaced as unverified metadata only; ProofLens does not cryptographically validate the manifest or signer without a dedicated verifier.

## Store, product and claim checks

Store/product routes inspect provided addresses, text, and user-entered prices. Page fetching is opt-in (`fetch_page: true`). The fetcher permits HTTPS on port 443 only, rejects non-public DNS results, pins the validated IP while checking TLS for the hostname, follows at most three revalidated redirects, caps HTML at 1.5 MB, and uses short timeouts. Store checks inspect the home page and at most two same-host policy/contact links; product checks fetch one page. It does not submit forms, follow off-site links, or authenticate sellers. Contact details, returns, reviews, and product authenticity remain unverified.

Claim analysis uses Google Fact Check Tools `claims.search` when `FACT_CHECK_API_KEY` is configured. It preserves publisher, title, rating, date, and HTTPS source link. Results are explicitly publisher assessments: a supported/not-supported summary requires multiple agreeing reviews; conflicting or sparse reviews stay cautious. Without a key, users can submit up to three HTTPS source URLs; ProofLens safely fetches and cites them as unverified user-provided references, while the verdict remains `INSUFFICIENT EVIDENCE`. The claim text is sent to Google for search only when the provider key is configured. See [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api).

## PDF reports

`GET /api/v1/reports/{scan_id}/pdf` requires the owner's session and exports a text-only report containing score, explanation, evidence, and actions. It excludes original submitted content and private analyzer metadata.
