# QA assets

These fixtures are intentionally harmless test inputs. Test accounts, names, and email addresses are generated per run with Faker and `.example` domains; no real customer data is used. API suites delete the temporary account and its scans in teardown.

- `sample-message.txt`: synthetic scam-like message fixture.
- `safe-example-url.txt`: IANA-reserved example domain for deterministic URL analysis.
- `sample-image.svg`: tiny local image fixture for upload and responsive-image checks.
- `sample-claim.json`: fictional claim payload for API and BDD examples.
- `sample-upload.txt`: benign file upload fixture.

No malware sample or live phishing URL is included.
