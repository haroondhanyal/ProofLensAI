# ProofLens AI Web

**Check Before You Trust.** ProofLens helps people inspect suspicious links, files, images, claims, and messages using explainable signals and evidence.

This branch contains the ProofLens web frontend, API backend, browser extension, and shared project documentation. The standalone Expo/React Native app is maintained on the `mobile-app` branch.

## Requirements

- Node.js 22.13+ or 24.3+
- Python 3.11+
- PostgreSQL 14+ (SQLite is available for local development)

## Run locally

1. Copy `.env.example` to `.env`, then set a strong `JWT_SECRET` and, if using PostgreSQL, `DATABASE_URL`.
2. Start the backend:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API is at http://localhost:8000 and its Swagger UI is at http://localhost:8000/docs.

3. From the repository root, install and start the web app:

```sh
nvm use
npm install
npm run dev:web
```

Open http://localhost:3000. On the sign-in screen, **Explore sample workspace** opens read-only reports with fictional sample data.

## What is included

- Web workspace with signup, login, password reset, account settings, and multiple themes.
- URL, message, screenshot, QR, image, file, store, product, and claim analysis with evidence reports and history.
- FastAPI backend with session authentication, SQLite development support, PostgreSQL support, and private report sharing.
- Optional local AI explanations through Ollama. AI advice is separate from evidence and does not set risk scores.
- Browser extension source in [`apps/extension/`](apps/extension/README.md).

Optional integrations such as ClamAV, YARA, Google Web Risk, fact checks, and media analysis are described in [`docs/phase2-integrations.md`](docs/phase2-integrations.md). Provider keys and local services are not required for the sample workspace.

## Checks

```sh
npm run lint
npm run build:web
npm run test:backend
```

For browser/API end-to-end checks, start the backend, then run `npx playwright install chromium` and `npm run test:e2e`.

See [`docs/architecture.md`](docs/architecture.md), [`docs/risk-engine.md`](docs/risk-engine.md), [`docs/security.md`](docs/security.md), and [`docs/api.md`](docs/api.md) for more detail.

## Privacy and limitations

Optional external providers receive the data needed for the enabled check; review their terms and data handling before configuring credentials. Scan text is stored with its report in the local database. Shared reports omit the original submitted content. A low-risk result is not a safety guarantee, and a risk score is not a probability.
