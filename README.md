# ProofLens AI — Web and API

**Check Before You Trust.** ProofLens helps people inspect suspicious links, files, images, claims, and messages using explainable signals and evidence.

This is the web project branch (`main`). It contains the Next.js web app, FastAPI backend, browser extension, and shared documentation. The standalone Expo/React Native application, with its own root README, is kept on the `mobile-app` branch.

## Web app features

- Account registration, sign-in, password reset, profile/password settings, and selectable themes.
- An authenticated workspace with dashboard, analyzer, scan history, and evidence reports.
- Checks for URLs, messages, screenshots, QR codes, images, files, stores, products, and claims.
- Optional local AI explanations through Ollama. AI advice is identified separately and does not set evidence or risk scores.
- A browser extension for Chrome, Edge, and Firefox that hands a user-selected page, link, or text to the web workspace.
- Fictional, read-only sample reports through **Explore sample workspace** on the sign-in screen.

## Requirements

- Node.js 22.13+ or 24.3+
- Python 3.11+
- SQLite for the simplest local setup, or PostgreSQL 14+

## Start the project locally

### 1. Configure the backend

Copy `.env.example` to `.env`. Set a strong `JWT_SECRET`; configure `DATABASE_URL` when using PostgreSQL. SQLite is available for local development.

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000 and its Swagger UI is at http://localhost:8000/docs.

### 2. Install and start the web app

From the repository root:

```sh
nvm use
npm install
npm run dev:web
```

Open http://localhost:3000. You can register/sign in for live API checks, or choose **Explore sample workspace** for fictional read-only example reports. A live scan requires a running API.

## Browser extension (Phase 3)

Build both browser packages from the repository root:

```sh
npm run build:extension
```

Load `apps/extension/dist/chrome/` as an unpacked extension in Chrome or Edge. In Firefox 140+, load `apps/extension/dist/firefox/manifest.json` from `about:debugging`. Use the toolbar popup for the current page or selected text, or the context menu for pages, links, and selections. The extension opens the web app; sign in, review the content, then choose **Analyze safely** to run the shared API flow. See [`apps/extension/README.md`](apps/extension/README.md) for permissions, data flow, and detailed setup.

## API, integrations, and project docs

The API provides session authentication, scan endpoints, history, private report sharing, and report export. SQLite is the simplest development database; PostgreSQL is supported for deployment. Optional integrations such as ClamAV, YARA, Google Web Risk, fact checks, and media analysis are documented in [`docs/phase2-integrations.md`](docs/phase2-integrations.md). Provider credentials and local services are not needed for the sample workspace.

- [`docs/architecture.md`](docs/architecture.md) — service and app layout.
- [`docs/api.md`](docs/api.md) — API routes and request/response conventions.
- [`docs/risk-engine.md`](docs/risk-engine.md) — evidence and risk scoring.
- [`docs/security.md`](docs/security.md) — security model and data handling.
- [`apps/extension/README.md`](apps/extension/README.md) — browser package setup.

## Developer commands

```sh
npm run lint
npm run build:web
npm run build:extension
npm run test:backend
```

Browser/API end-to-end checks are available after starting the backend: install Playwright Chromium with `npx playwright install chromium`, then run `npm run test:e2e`.

## Data and limitations

Submitted scan content is stored with its report in the configured database. Optional external providers receive the data needed for the enabled check; review provider terms and data handling before configuring them. Private shared reports omit the original submitted content. Sample reports are fictional and read-only. A low-risk result is not a safety guarantee, and a score is not a probability.
