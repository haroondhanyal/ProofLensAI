(() => {
  const MAX_TEXT_LENGTH = 12000;
  const SENSITIVE_QUERY_KEYS = /^(?:token|access_token|refresh_token|id_token|session|sessionid|password|passwd|secret|signature|sig|code|auth|authorization|api_key|apikey)$/i;

  function cleanSubmittedUrl(value) {
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      parsed.username = '';
      parsed.password = '';
      parsed.hash = '';
      for (const key of [...parsed.searchParams.keys()]) {
        if (SENSITIVE_QUERY_KEYS.test(key)) parsed.searchParams.delete(key);
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  function normalizeWorkspaceUrl(value) {
    try {
      const parsed = new URL(value.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }

  function handoffUrl(origin, request) {
    const normalizedOrigin = normalizeWorkspaceUrl(origin) ?? 'http://localhost:3000';
    const value = request.kind === 'url'
      ? cleanSubmittedUrl(request.value)
      : String(request.value ?? '').trim().slice(0, MAX_TEXT_LENGTH);
    if (!value) throw new Error('There is no safe content to send to ProofLens.');
    const target = new URL(normalizedOrigin);
    target.hash = `prooflens=${encodeURIComponent(JSON.stringify({ kind: request.kind, value }))}`;
    return target.toString();
  }

  globalThis.ProofLensExtension = Object.freeze({
    MAX_TEXT_LENGTH,
    cleanSubmittedUrl,
    normalizeWorkspaceUrl,
    handoffUrl
  });
})();
