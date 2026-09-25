importScripts('shared.js');

const extensionApi = globalThis.browser ?? globalThis.chrome;
const { cleanSubmittedUrl, handoffUrl } = globalThis.ProofLensExtension;
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
    const value = cleanSubmittedUrl(info.linkUrl);
    if (value) void openProofLens({ kind: 'url', value });
  } else if (info.menuItemId === MENU_TEXT && info.selectionText) {
    void openProofLens({ kind: 'text', value: info.selectionText });
  } else if (info.menuItemId === MENU_PAGE && tab?.url) {
    const value = cleanSubmittedUrl(tab.url);
    if (value) void openProofLens({ kind: 'url', value });
  }
});

async function openProofLens(request) {
  const settings = await extensionApi.storage.local.get({ webAppUrl: 'http://localhost:3000' });
  await extensionApi.tabs.create({ url: handoffUrl(settings.webAppUrl, request) });
}
