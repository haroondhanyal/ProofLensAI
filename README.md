# ProofLens AI Mobile

Expo and React Native client for ProofLens AI. The mobile app has its own repository branch (`mobile-app`) and uses the shared ProofLens API for authentication, scans, history, and reports.

## Requirements

- Node.js 22.13+ or 24.3+
- Android Studio with Android SDK 36 for Android builds
- Xcode for iOS builds on macOS
- A running ProofLens API backend

## Configure the API

Copy the example environment file and set the API address for the device you are using:

```sh
cp .env.mobile.example .env
```

Edit `EXPO_PUBLIC_API_URL` in `.env`:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator: `http://localhost:8000/api/v1`
- Physical phone: use the development computer's LAN IP, for example `http://192.168.1.20:8000/api/v1`

Keep the phone and development computer on the same network. Local `.env` files are ignored by Git.

## Install and run

```sh
npm install
npx expo start
```

Open the project in Expo Go when supported, or press `a` / `i` to launch an installed Android or iOS simulator. Native features such as camera and OS share intents require a development build for full device testing.

## Build Android

For a local Android debug build:

```sh
npx expo run:android
```

To create a standalone APK with the JavaScript bundle included:

```sh
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. The local generated `android/` directory and build output are ignored by Git. Release builds intended for Play Store distribution need a production signing key.

## Project structure

- `src/app/` — Expo Router routes and navigators
- `src/core/api/` — shared authenticated API client
- `src/core/theme/` — theme palette
- `src/features/auth/` — sign in, signup, password recovery
- `src/features/workspace/` — dashboard, analyzer, history, settings, and reports
- `src/features/analysis/` — scan types, sample reports, and PDF sharing
- `src/features/ai/` — API AI status and explanation UI
- `src/features/share/` — incoming shared content screen

Screens use React function components and hooks. Route files stay small and delegate feature UI to `src/features/`. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for details.

## Quality checks

```sh
npx expo lint
npx tsc --noEmit
npx expo-doctor
```

The app displays AI explanations only when the API has a local model configured. AI advice does not change the risk score. Sample reports are fictional and read-only.
