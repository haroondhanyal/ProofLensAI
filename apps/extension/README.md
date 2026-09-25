# ProofLens AI browser extension

The Phase 3 extension connects Chrome, Edge, and Firefox to the existing ProofLens web app and API. It can hand off the current page URL, a link URL, or selected text. The web app asks you to sign in, lets you review the content, and runs the check only after you choose **Analyze safely**. The resulting evidence report opens in the web workspace.

## Build

From the repository root, run:

```sh
npm run build:extension
```

This creates two loadable builds:

- `apps/extension/dist/chrome/` — Chrome and Edge (Manifest V3 service worker).
- `apps/extension/dist/firefox/` — Firefox 140+ (Manifest V3 background script and required built-in data disclosure).

The generated `dist/` directory is ignored by Git. Rebuild after changing extension source files.

## Load for local development

1. Start the ProofLens API and web app. The default web app address is `http://localhost:3000`; set the configured API URL in the web app environment as described in the main README.
2. Run `npm run build:extension` from the repository root.
3. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`, enable developer mode, choose **Load unpacked**, and select `apps/extension/dist/chrome/`.
4. In Firefox 140+, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `apps/extension/dist/firefox/manifest.json`.
5. Use the toolbar popup for the current page or selected text. Right-click a page, link, or selected text for the corresponding context-menu action.
6. Sign in if prompted, review the prefilled content, then choose **Analyze safely**. The full report uses the same API and account history as the web app.

Use **Workspace settings** to set the HTTPS origin of a deployed web app. For LAN/device testing, an HTTP origin is accepted; the extension strips any path and stores only its origin.

## Data flow and permissions

- The extension does not scan in the background or call an analysis provider directly. A page, link, or selection is sent only after you invoke an extension action.
- Page URLs must use HTTP or HTTPS. Embedded credentials, fragments, and common authentication query parameters (such as `token`, `session`, and `code`) are removed before handoff. Other URL query parameters remain because they may identify the page being checked.
- Selected text is trimmed and limited to 12,000 characters. The web app receives the handoff in a URL fragment, which its page removes from the address bar during startup. Review the web app and network provider settings before sending sensitive material; the web app submits it to the ProofLens API only after you choose **Analyze safely**.
- The extension stores only the configured web app origin. It does not store ProofLens credentials, session tokens, or provider keys.
- `activeTab` and `scripting` are used to read text you selected on the active page; `contextMenus` provides explicit right-click actions; `storage` remembers the web app origin; `tabs` opens the web workspace.
- The Firefox build declares the data categories required by Firefox's built-in consent flow because user-selected website URLs and content are handed to the ProofLens service.

These are development builds. Store listing, signing, and browser-store review are still required before public distribution.
