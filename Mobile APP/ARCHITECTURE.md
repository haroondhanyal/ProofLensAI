# Mobile app structure

The app uses Expo Router for URLs and route entry points, React Native function components for screens, and hooks for state. React class components are intentionally not used: functions and typed props are the idiomatic React Native pattern.

```text
Mobile APP/
├── App.tsx                              compatibility entry, forwards to the workspace screen
└── src/
    ├── app/                             route files only
    │   ├── _layout.tsx
    │   ├── index.tsx                    workspace entry
    │   ├── forgot-password.tsx          auth route entry
    │   ├── reset-password.tsx           auth route entry
    │   ├── handle-share.tsx             OS share route entry
    │   └── +native-intent.ts            native share URL handoff
    ├── core/
    │   ├── api/client.ts                API URL, cookie refresh, shared response types
    │   └── theme/palette.ts             shared workspace theme contract
    └── features/
        ├── ai/                          model status and AI UI
        │   ├── components/AiStatusCard.tsx
        │   ├── services/aiStatus.ts
        │   └── types/aiStatus.ts
        ├── analysis/                    scan contracts and synthetic sample reports
        │   ├── data/demoScans.ts
        │   ├── services/exportPdf.ts     authenticated PDF retrieval and native share
        │   └── types/scan.ts
        ├── auth/
        │   ├── components/CountryCodeField.tsx
        │   ├── data/phoneCountries.ts
        │   └── screens/                 sign in, registration, forgot/reset screens
        ├── share/screens/HandleShareScreen.tsx
        └── workspace/screens/
            ├── WorkspaceScreen.tsx       signed-in workspace coordinator
            ├── OverviewScreen.tsx        dashboard and AI availability
            ├── AnalyzerScreen.tsx        Phase 1 and Phase 2 scan inputs
            ├── HistoryScreen.tsx         searchable scan list, saved/high-risk filters, save and delete actions
            ├── SettingsScreen.tsx        profile, password, themes, retention, and account deletion
            └── ScanReportScreen.tsx      evidence, AI advice, PDF, share/revoke, save/delete, and Phase 2 metadata
```

`WorkspaceScreen` owns the signed-in session and coordinates the typed overview, analyzer, history, settings, camera, and report screens. Route files stay small and point to a feature screen. Keep new UI and domain logic under its feature rather than placing it in route files.

## Shared backend and AI

`core/api/client.ts` is the only mobile API transport. It applies the configured `EXPO_PUBLIC_API_URL`. Native registration and login use the mobile API session routes; access and rotating refresh tokens are stored with Expo SecureStore and sent as Bearer credentials. An expired access token is refreshed once and the new pair is persisted. Logout revokes the refresh session and clears device credentials. Expo Web continues to use the web app's HttpOnly-cookie session routes. All scan types use the same authenticated analysis endpoints as web: URL, message, screenshot, QR, image, file, store, product, claim, PDF export, and report actions.

The mobile overview and web workspace read `/health` and show whether the API server has local Ollama configured. Message reports display the returned AI explanation when available. The provider is configured on the API server with `LOCAL_AI_URL` and `LOCAL_AI_MODEL`; without it, rules-based analysis remains available. AI advice stays separate from evidence and never sets the risk score.

The mobile OS share screen accepts shared text, website links, and images, then sends the selected item to the same API. If authentication has expired, it routes the user through sign-in and returns to the pending share without clearing it. Native share registration needs an Expo development build to verify on physical iOS and Android devices.
