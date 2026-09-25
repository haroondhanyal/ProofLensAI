# Phase 1 architecture

The Next.js app calls the FastAPI `/api/v1` API. The API validates input, runs deterministic local analyzers, records a scan plus evidence rows, and returns a structured report. PostgreSQL is supported through `DATABASE_URL`; SQLite is the no-configuration local fallback.

The initial URL analyzer never fetches URLs. This avoids SSRF while the hardened fetcher and revalidation rules are built. Threat feed results are never simulated. Message checks run fixed phrase rules and pass detected URLs through the local URL analyzer.

Phase 2 adds static file inspection and local byte-pattern triage, optional YARA/ClamAV adapters, optional Google Web Risk and media authenticity adapters, URL/store/product analyzers with explicit opt-in safe public-page fetching, source-preserving claim verification through Google Fact Check Tools when configured, and owner-only PDF report export. Uploads are read in memory, bounded by configuration, never extracted or executed, and are not retained as files. Missing provider credentials leave those provider findings unavailable; the product never invents provider results or claim citations.
