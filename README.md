# ProofLens AI — Mobile App

The standalone Expo and React Native client for ProofLens AI. This project is maintained on the `mobile-app` Git branch. It calls the ProofLens API maintained with the web app on the [`main` branch](https://github.com/haroondhanyal/ProofLensAI/tree/main).

## What the app includes

- Sign in, account registration, country-code phone input, forgot-password, and reset-password screens.
- A signed-in workspace with overview, analyzer, scan history, account settings, password update, and theme selection.
- Native sign-in/register sessions with rotating refresh tokens stored in iOS Keychain or Android Keystore-backed storage; logout revokes the server session.
- Scan entry points for links, messages, screenshots, QR codes, images, files, stores, products, and claims, backed by the shared API.
- Evidence-based reports with risk level, score, confidence, findings, and recommended action.
- Optional local-AI availability and explanations returned by the backend. AI advice is shown separately and does not change evidence or risk scores.
- QR scanning through the device camera, image selection, private report links, and PDF report export/share.
- Incoming OS shares for text, web links, and images. The app previews the shared content and waits for the user to choose **Analyze shared content**. If the user needs to sign in first, the pending share stays available and the app returns to it after login or registration.
- Fictional sample scans for preview; samples are labeled and cannot be shared as live reports.
- Scan-history search and filters, save/unsave, delete, private-share creation/revocation, and PDF export.
- Account privacy settings for scan retention and a password-confirmed account deletion flow.

## Implementation status

The app implementation includes the mobile account, scan, report, sharing, history, and privacy workflows listed above. Current code checks pass: Expo lint, TypeScript typecheck, and Android/iOS JavaScript bundle export.

The app is **not yet a published or device-verified release**. Before release, configure a reachable HTTPS API, apply the backend migrations, verify camera and OS sharing on physical iOS and Android devices, create signed production builds, and complete store review. Production builds require the publisher's Expo, Apple, and Google Play credentials.

## Requirements

- Node.js `^22.13.0`, `^24.3.0`, or `>=25.0.0` (matches `package.json`)
- npm
- Expo Go for compatible preview workflows
- Android Studio/Android SDK for Android simulator or device builds
- Xcode and macOS for iOS simulator or device builds
- A reachable ProofLens API backend for sign-in and live analysis

## Configure the API address

The API server is in the web project on `main`; this branch contains only the mobile app. For local development, start the backend from a separate `main` checkout using the web README's backend steps. Run `alembic upgrade head` before testing scan-retention settings.

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

## EAS build profiles

`eas.json` includes internal preview profiles (Android APK and iOS simulator) and a production profile (Android App Bundle and iOS device archive). Sign in to an Expo account, set `EXPO_PUBLIC_API_URL` in the EAS environment to the deployed HTTPS API URL, then run:

```sh
npm run build:android:preview
npm run build:ios:simulator
npm run build:production
```

Production iOS distribution requires Apple Developer signing credentials; Google Play publication requires the publisher's Play Console account and signing setup. EAS can guide credential creation, but those accounts and store approvals belong to the publisher. Production API traffic must use HTTPS; HTTP addresses are for local development on a trusted network.

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

Live scan content is sent to the configured ProofLens API and handled under that server's settings and provider configuration. Review those settings before analyzing sensitive content. No scan runs just because a link or file was shared into the app; the user reviews it and starts the analysis. External analysis providers may receive submitted content when enabled on the backend. Camera permission is used for QR scanning, and photo access is used when choosing an image. Apply backend database migrations before using scan-retention controls. Store release signing, store listings, and physical-device release QA are separate release tasks.
