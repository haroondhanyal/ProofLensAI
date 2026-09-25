# API

All routes use `/api/v1`. Authentication uses a short-lived HttpOnly JWT cookie. In local development use the same `localhost` host for the web app and API so the browser sends the cookie.

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `DELETE /auth/me`
- Password reset: `POST /auth/forgot-password`, `POST /auth/reset-password` (configure SMTP for email delivery).
- `POST /analyze/url`, `POST /analyze/message`
- `POST /analyze/file` (PDF, DOCX, XLSX, PPTX, ZIP, text, selected executable metadata; bounded and static only)
- `POST /analyze/store`, `POST /analyze/product`, `POST /analyze/claim`
- `GET /reports/{public_id}/pdf` (authenticated PDF download)
- `POST /analyze/image` optionally calls the configured image authenticity provider; its output cannot directly set the risk score.
- `GET /scans` (supports `limit`, `offset`, `scan_type`, `risk_level`, `saved_only`, `query`, `date_from`, `date_to`), `GET /scans/{public_id}`, `DELETE /scans/{public_id}`
- `POST /scans/{public_id}/save`
- `POST /reports/{public_id}/share`, `DELETE /reports/{public_id}/share`
- `GET /public/reports/{share_id}`

Interactive docs: `/docs`.

Optional integrations are disabled unless configured: Google Web Risk (`WEB_RISK_API_KEY`), media authenticity/deepfake provider (`MEDIA_PROVIDER_URL`, `MEDIA_PROVIDER_API_KEY`), YARA (`YARA_RULES_PATH`) and ClamAV (`ANTIVIRUS_SOCKET`, or local `ANTIVIRUS_HOST`/`ANTIVIRUS_PORT`). External URL and media provider calls disclose submitted content to that configured service. No sources or scan results are simulated.

URL, store, and product request bodies accept `fetch_page: true` to opt in to a bounded HTTPS fetch for public hosts. URL inspection reports status, redirect count, final address, and basic password/payment form indicators. Store inspection reads only the home page and at most two same-host policy/contact pages; product inspection reads one page. Private and non-public addresses, non-HTTPS schemes, and nonstandard ports are blocked. This is passive inspection and does not submit forms.

Claim requests may include up to three HTTPS `source_urls`. These pages are fetched safely and shown as user-supplied, unverified references; they do not generate a supported/refuted verdict. Google Fact Check publisher reviews remain available only when `FACT_CHECK_API_KEY` is configured.
