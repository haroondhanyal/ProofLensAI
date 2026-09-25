# ProofLens AI browser extension

This unpacked WebExtension supports Chrome, Edge, and Firefox with Manifest V3. It sends a page URL, a link URL, or selected text to the configured ProofLens web app. The app then uses its existing authenticated API flow and shows the normal ProofLens analysis form and report.

## Load for local development

1. Start the ProofLens API and web app (`npm run dev:web`). The default extension target is `http://localhost:3000`; change it in **Workspace settings** if Next.js selected another port.
2. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`, enable developer mode, and select **Load unpacked**. Choose this `apps/extension/` directory.
3. In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `apps/extension/manifest.json`.
4. Use the toolbar popup to check the current page or selected text. Right-click a page, link, or selected text to send that item to ProofLens.
5. Sign in if prompted, review the prefilled content, then choose **Analyze safely**. The resulting report uses the same API and account history as the web app.

The extension needs `activeTab`, `scripting`, `contextMenus`, and `storage` only. It does not fetch scanned content itself or require backend CORS/auth changes. Text is carried in the app URL fragment (not sent in the HTTP request); the web app removes it from the address bar on load. The extension stores only the configured web app origin.

For a deployed app, set its HTTPS origin in **Workspace settings**. The web app must be reachable by the browser and its own `NEXT_PUBLIC_API_URL` must point to the intended ProofLens API.
