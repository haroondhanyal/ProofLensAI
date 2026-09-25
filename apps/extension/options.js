const extensionApi = globalThis.browser ?? globalThis.chrome;
const field = document.getElementById('web-app-url');
const status = document.getElementById('status');

extensionApi.storage.local.get({ webAppUrl: 'http://localhost:3000' }).then(settings => {
  field.value = settings.webAppUrl;
});

document.getElementById('save').addEventListener('click', async () => {
  try {
    const parsed = new URL(field.value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS web app URL.');
    await extensionApi.storage.local.set({ webAppUrl: parsed.origin });
    field.value = parsed.origin;
    status.textContent = 'Workspace address saved.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Enter a valid web app URL.';
  }
});
