# ProofLens AI — Mobile App

The standalone Expo and React Native client for ProofLens AI. This project is maintained separately from the web/API project on the `mobile-app` Git branch. Its screens use the same ProofLens API; the backend and web app are documented on the `main` branch.

## What the app includes

- Sign in, account registration, country-code phone input, forgot-password, and reset-password screens.
- A signed-in workspace with overview, analyzer, scan history, account settings, password update, and theme selection.
- Scan entry points for links, messages, screenshots, QR codes, images, files, stores, products, and claims, backed by the shared API.
- Evidence-based reports with risk level, score, confidence, findings, and recommended action.
- Optional local-AI availability and explanations returned by the backend. AI advice is shown separately and does not change evidence or risk scores.
- QR scanning through the device camera, image selection, private report links, and PDF report export/share.
- Incoming OS shares for text, web links, and images. The app previews the shared content and waits for the user to choose **Analyze shared content**.
- Fictional sample scans for preview; samples are labeled and cannot be shared as live reports.

## Requirements

- Node.js 22.13+ or 24.3+
- npm
- Expo Go for compatible preview workflows
- Android Studio/Android SDK for Android simulator or device builds
- Xcode and macOS for iOS simulator or device builds
- A reachable ProofLens API backend for sign-in and live analysis

## Configure the API address

Create a local environment file in the project root:

```sh
cp .env.mobile.example .env
```

Set `EXPO_PUBLIC_API_URL` to the backend API root ending in `/api/v1`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Use an address reachable from the environment running the app:

| Target | Example API URL |
| --- | --- |
| iOS simulator | `http://localhost:8000/api/v1` |
| Android emulator | `http://10.0.2.2:8000/api/v1` |
| Physical phone | `http://192.168.1.20:8000/api/v1` (replace with your computer's LAN IP) |

For a physical phone, allow the backend through the computer firewall and put both devices on the same network. The `.env` file is local configuration and should not be committed. A sample workspace may be available without a live backend, but live authentication and scans require the API.

## Install and start

Run these commands from the root of the mobile branch:

```sh
npm install
npm run start
```

Expo shows a QR code and development shortcuts. Open it with Expo Go where the native modules are supported, or press `a` / `i` to start an installed Android / iOS simulator. Use `npm run web` for the Expo web preview.

## Native development builds

Camera access and OS share registration need a native development build for reliable device verification. Generate/run the platform project with:

```sh
npm run android
npm run ios
```

`npm run ios` requires macOS with Xcode. Follow Expo's prompts for native project generation. Do not commit generated platform build folders unless the team intentionally adopts a native-project workflow.

## Project structure

```text
src/
├── app/                         Expo Router route entries and native share intent
├── core/
│   ├── api/client.ts            API URL, authenticated fetch, refresh, API errors
│   └── theme/palette.ts         Shared app theme contract
└── features/
    ├── ai/                      Backend model status and AI explanation UI
    ├── analysis/                Scan types, demo data, PDF export/share
    ├── auth/                    Auth screens and country-code field/data
    ├── share/                   Incoming OS share preview and analyze flow
    └── workspace/               Overview, analyzer, history, settings, reports
```

Route files in `src/app/` stay small and delegate screens and domain logic to `src/features/`. `WorkspaceScreen` coordinates the signed-in workspace and its active screen. `core/api/client.ts` is the shared mobile HTTP entry point; feature screens should use it instead of constructing API URLs independently.

For a fuller route, data-flow, and component guide, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Useful commands

```sh
npm run lint
npm run typecheck
npx expo-doctor
```

## Data handling and limitations

Live scan content is sent to the configured ProofLens API and handled under that server's settings and provider configuration. Review those settings before analyzing sensitive content. No scan runs just because a link or file was shared into the app; the user reviews it and starts the analysis. External analysis providers may receive submitted content when enabled on the backend. Camera permission is used for QR scanning, and photo access is used when choosing an image. Store release signing, store listings, and physical-device release QA are separate release tasks.
