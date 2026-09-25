const extensionApi = globalThis.browser ?? globalThis.chrome;
const address = document.getElementById('page-address');
const status = document.getElementById('status');
const checkPage = document.getElementById('check-page');
const checkSelection = document.getElementById('check-selection');
const { cleanSubmittedUrl, handoffUrl, MAX_TEXT_LENGTH } = globalThis.ProofLensExtension;

async function currentTab() {
  const [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function selectedText(tabId) {
  try {
    const results = await extensionApi.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString().trim().slice(0, 12000) ?? ''
    });
    return results?.[0]?.result ?? '';
  } catch {
    return '';
  }
}

async function init() {
  const tab = await currentTab();
  const pageUrl = tab?.url ? cleanSubmittedUrl(tab.url) : null;
  if (!tab?.id || !pageUrl) {
    address.textContent = 'This browser page cannot be checked.';
    checkPage.disabled = true;
    checkSelection.disabled = true;
    status.textContent = 'Open a regular website tab to use ProofLens.';
    return;
  }
  address.textContent = new URL(pageUrl).hostname;
  address.title = 'Authentication query parameters, URL fragments, and embedded credentials are removed before handoff.';
  const selection = await selectedText(tab.id);
  checkSelection.disabled = !selection;
  checkPage.addEventListener('click', () => void send({ kind: 'url', value: pageUrl }));
  checkSelection.addEventListener('click', () => void send({ kind: 'text', value: selection.slice(0, MAX_TEXT_LENGTH) }));
}

async function send(request) {
  checkPage.disabled = true;
  checkSelection.disabled = true;
  status.textContent = 'Opening your ProofLens workspace…';
  try {
    const settings = await extensionApi.storage.local.get({ webAppUrl: 'http://localhost:3000' });
    await extensionApi.tabs.create({ url: handoffUrl(settings.webAppUrl, request) });
    window.close();
  } catch {
    status.textContent = 'Could not open ProofLens. Check the workspace address in settings.';
    checkPage.disabled = false;
    checkSelection.disabled = false;
  }
}

document.getElementById('settings').addEventListener('click', () => extensionApi.runtime.openOptionsPage());
void init();
