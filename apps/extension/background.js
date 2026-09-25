const extensionApi = globalThis.browser ?? globalThis.chrome;
const MENU_PAGE = 'prooflens-check-page';
const MENU_LINK = 'prooflens-check-link';
const MENU_TEXT = 'prooflens-check-text';

extensionApi.runtime.onInstalled.addListener(() => {
  const addMenus = () => {
    extensionApi.contextMenus.create({ id: MENU_PAGE, title: 'Check this page with ProofLens', contexts: ['page'] });
    extensionApi.contextMenus.create({ id: MENU_LINK, title: 'Check link with ProofLens', contexts: ['link'] });
    extensionApi.contextMenus.create({ id: MENU_TEXT, title: 'Check selected text with ProofLens', contexts: ['selection'] });
  };
  if (globalThis.browser) void extensionApi.contextMenus.removeAll().then(addMenus);
  else extensionApi.contextMenus.removeAll(addMenus);
});

extensionApi.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_LINK && info.linkUrl) {
    void openProofLens({ kind: 'url', value: info.linkUrl });
  } else if (info.menuItemId === MENU_TEXT && info.selectionText) {
    void openProofLens({ kind: 'text', value: info.selectionText });
  } else if (info.menuItemId === MENU_PAGE && tab?.url) {
    void openProofLens({ kind: 'url', value: tab.url });
  }
});

async function openProofLens(request) {
  const value = request.value.slice(0, 12000);
  const settings = await extensionApi.storage.local.get({ webAppUrl: 'http://localhost:3000' });
  const base = validateWebAppUrl(settings.webAppUrl);
  const target = new URL(base);
  target.hash = `prooflens=${encodeURIComponent(JSON.stringify({ kind: request.kind, value }))}`;
  await extensionApi.tabs.create({ url: target.toString() });
}

function validateWebAppUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin;
  } catch {
    // Use the local development app when the saved address is invalid.
  }
  return 'http://localhost:3000';
}
