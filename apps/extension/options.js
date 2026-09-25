const extensionApi = globalThis.browser ?? globalThis.chrome;
const field = document.getElementById('web-app-url');
const status = document.getElementById('status');
const { normalizeWorkspaceUrl } = globalThis.ProofLensExtension;

void extensionApi.storage.local.get({ webAppUrl: 'http://localhost:3000' }).then(settings => {
  field.value = normalizeWorkspaceUrl(settings.webAppUrl) ?? 'http://localhost:3000';
}).catch(() => { status.textContent = 'Could not load the saved workspace address.'; });

document.getElementById('save').addEventListener('click', async () => {
  try {
    const origin = normalizeWorkspaceUrl(field.value);
    if (!origin) throw new Error('Enter a valid HTTP or HTTPS address without a username or password.');
    await extensionApi.storage.local.set({ webAppUrl: origin });
    field.value = origin;
    status.textContent = 'Workspace address saved.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Enter a valid web app URL.';
  }
});
