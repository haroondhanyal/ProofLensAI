import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const api = __ENV.API_BASE_URL || 'http://host.docker.internal:8000/api/v1';
const origin = api.replace(/\/api\/v1\/?$/, '');
const vus = Number(__ENV.K6_VUS || 10);
const duration = __ENV.K6_DURATION || '30s';
const email = `prooflens-k6-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
const password = `ProofLens-K6-${Math.random().toString(16).slice(2)}-Password!`;
const sampleText = open('../../e2e/assets/sample-upload.txt');
const sampleImage = open('../../e2e/assets/sample-image.png', 'b');

const featureDefinitions = [
  ['health', 'GET', '/health', 200],
  ['profile-read', 'GET', '/auth/me', 200],
  ['profile-update', 'PATCH', '/auth/me', 200],
  ['privacy-read', 'GET', '/auth/me/privacy', 200],
  ['privacy-update', 'PATCH', '/auth/me/privacy', 200],
  ['analyze-url', 'POST', '/analyze/url', 200],
  ['analyze-message', 'POST', '/analyze/message', 200],
  ['analyze-store', 'POST', '/analyze/store', 200],
  ['analyze-product', 'POST', '/analyze/product', 200],
  ['analyze-claim', 'POST', '/analyze/claim', 200],
  ['analyze-file', 'POST', '/analyze/file', 200],
  ['analyze-screenshot', 'POST', '/analyze/screenshot', 200],
  ['analyze-image', 'POST', '/analyze/image', 200],
  ['analyze-qr', 'POST', '/analyze/qr', 200],
  ['scan-history', 'GET', '/scans', 200],
  ['scan-detail', 'GET', '/scans/{scanId}', 200],
  ['scan-save', 'POST', '/scans/{scanId}/save', 200],
  ['report-pdf', 'GET', '/reports/{scanId}/pdf', 200],
  ['report-share', 'POST', '/reports/{scanId}/share', 200],
  ['public-report', 'GET', '/public/reports/{shareId}', 200],
  ['avatar-read', 'GET', '/auth/me/avatar', 200],
];
const analyzerFamilies = featureDefinitions.filter(([family]) => String(family).startsWith('analyze-'));
const readWriteFamilies = featureDefinitions.filter(([family]) => !String(family).startsWith('analyze-'));
const cases = Array.from({ length: 150 }, (_, index) => {
  // Keep analyzer traffic below the API's intentional 30/minute safety limit while
  // distributing all eight analyzer routes across the full test window.
  const definition = index % 6 === 0
    ? analyzerFamilies[Math.floor(index / 6) % analyzerFamilies.length]
    : readWriteFamilies[index % readWriteFamilies.length];
  return { id: `K6-${String(index + 1).padStart(3, '0')}`, family: definition[0], method: definition[1], path: definition[2], expected: definition[3] };
});
const attempts = new Counter('prooflens_case_attempts');
const casePass = cases.map((scenario) => new Rate(scenario.id.replaceAll('-', '_')));
const caseLatency = cases.map((scenario) => new Trend(`${scenario.id.replaceAll('-', '_')}_http_duration`, true));
const caseHttpStatus = cases.map((scenario) => new Trend(`${scenario.id.replaceAll('-', '_')}_http_status`));
const caseResponseChars = cases.map((scenario) => new Trend(`${scenario.id.replaceAll('-', '_')}_response_chars`));

export const options = {
  scenarios: {
    qa_performance_matrix: { executor: 'constant-vus', vus, duration, gracefulStop: '5s' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

function jsonHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export function setup() {
  const registered = http.post(`${api}/auth/mobile/register`, JSON.stringify({
    email, password, display_name: 'ProofLens k6 QA',
  }), { headers: { 'Content-Type': 'application/json' }, tags: { category: 'qa-setup' } });
  if (registered.status !== 201) throw new Error(`ProofLens k6 account setup failed (${registered.status}): ${registered.body}`);
  const first = registered.json('data');
  const sessions = [first];
  const seedResponse = http.post(`${api}/analyze/url`, JSON.stringify({ content: 'https://example.com/prooflens-k6-seed', fetch_page: false }), {
    headers: jsonHeaders(first.access_token), tags: { category: 'qa-setup' },
  });
  if (seedResponse.status !== 200) throw new Error(`ProofLens k6 seed report failed (${seedResponse.status}): ${seedResponse.body}`);
  const seed = seedResponse.json('data');
  const shareResponse = http.post(`${api}/reports/${seed.scan_id}/share`, '{}', {
    headers: jsonHeaders(first.access_token), tags: { category: 'qa-setup' },
  });
  if (shareResponse.status !== 200) throw new Error(`ProofLens k6 share setup failed (${shareResponse.status})`);
  const avatarResponse = http.post(`${api}/auth/me/avatar`, {
    file: http.file(sampleImage, 'prooflens-k6-avatar.png', 'image/png'),
  }, { headers: { Authorization: `Bearer ${first.access_token}` }, tags: { category: 'qa-setup' } });
  if (avatarResponse.status !== 200) throw new Error(`ProofLens k6 avatar setup failed (${avatarResponse.status})`);
  return { sessions, scanId: seed.scan_id, shareId: shareResponse.json('data').share_id, password };
}

export function teardown(data) {
  if (!data?.sessions?.length) return;
  const accessToken = data.sessions[0].access_token;
  const headers = jsonHeaders(accessToken);
  const identity = http.get(`${api}/auth/me`, { headers, tags: { category: 'qa-cleanup' } });
  if (identity.status !== 200) console.error(`ProofLens k6 cleanup session check returned ${identity.status}: ${identity.body}`);
  const deleted = http.request('DELETE', `${api}/auth/me`, JSON.stringify({ password: data.password }), {
    headers, tags: { category: 'qa-cleanup' },
  });
  if (deleted.status !== 200) console.error(`ProofLens k6 cleanup needs review: DELETE account returned ${deleted.status}: ${deleted.body}`);
}

export default function qaPerformanceCase(data) {
  if (exec.scenario.iterationInTest >= cases.length) {
    sleep(1);
    return;
  }
  const caseIndex = exec.scenario.iterationInTest % cases.length;
  const scenario = cases[caseIndex];
  const session = data.sessions[0];
  const url = scenario.family === 'health' ? `${origin}${scenario.path}` : `${api}${scenario.path
    .replace('{scanId}', data.scanId).replace('{shareId}', data.shareId)}`;
  const idSuffix = `${scenario.id.toLowerCase()}-${exec.vu.idInTest}-${exec.vu.iterationInScenario}`;
  const headers = jsonHeaders(session.access_token);
  let response;
  if (scenario.family === 'profile-update') {
    response = http.patch(url, JSON.stringify({ display_name: `ProofLens k6 ${idSuffix}`, phone: '4155550182' }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'privacy-update') {
    const values = [30, 90, 180, 365];
    response = http.patch(url, JSON.stringify({ scan_retention_days: values[exec.vu.iterationInScenario % values.length] }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-url') {
    response = http.post(url, JSON.stringify({ content: `https://example.com/${idSuffix}`, fetch_page: false }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-message') {
    response = http.post(url, JSON.stringify({ content: `Synthetic ProofLens performance check ${idSuffix}. Verify requests through https://example.com.` }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-store') {
    response = http.post(url, JSON.stringify({ url: 'https://example.com/store', context: `Synthetic QA store ${idSuffix}`, fetch_page: false }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-product') {
    response = http.post(url, JSON.stringify({ description: `Synthetic QA headphones listing ${idSuffix}`, price: 49, reference_price: 99 }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-claim') {
    response = http.post(url, JSON.stringify({ claim: `Synthetic QA claim ${idSuffix}: Example City shared an update.` }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'analyze-file') {
    response = http.post(url, { file: http.file(sampleText, 'prooflens-k6.txt', 'text/plain') }, { headers: { Authorization: headers.Authorization }, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (['analyze-screenshot', 'analyze-image', 'analyze-qr'].includes(scenario.family)) {
    response = http.post(url, { file: http.file(sampleImage, 'prooflens-k6.png', 'image/png') }, { headers: { Authorization: headers.Authorization }, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'scan-history') {
    response = http.get(`${url}?limit=20`, { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'scan-save') {
    response = http.post(url, JSON.stringify({ saved: true }), { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else if (scenario.family === 'report-share') {
    response = http.post(url, '{}', { headers, tags: { case_id: scenario.id, category: scenario.family } });
  } else {
    response = http.get(url, { headers, tags: { case_id: scenario.id, category: scenario.family } });
  }
  const passed = check(response, { [`${scenario.id} ${scenario.family} expects HTTP ${scenario.expected}`]: (res) => res.status === scenario.expected });
  attempts.add(1, { case_id: scenario.id, category: scenario.family });
  casePass[caseIndex].add(passed ? 1 : 0);
  caseLatency[caseIndex].add(response.timings.duration);
  caseHttpStatus[caseIndex].add(response.status);
  caseResponseChars[caseIndex].add((response.body || '').length);
  // Pace one 150-case pass across 10 VUs and the 30-second QA window. This
  // respects ProofLens's shared 30/minute analyzer safety limit.
  sleep(1.8);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function handleSummary(data) {
  const metrics = data.metrics || {};
  const metricValue = (name, key) => Number(metrics[name]?.values?.[key] ?? 0);
  const requests = metricValue('http_reqs', 'count');
  const p95 = metricValue('http_req_duration', 'p(95)');
  const average = metricValue('http_req_duration', 'avg');
  const failedRate = metricValue('http_req_failed', 'rate');
  const failed = Math.round(failedRate * requests);
  const checkRate = metricValue('checks', 'rate');
  const status = failedRate < 0.01 && p95 < 500 && checkRate > 0.99 ? 'PASS' : 'REVIEW';
  const results = cases.map((scenario) => {
    const key = scenario.id.replaceAll('-', '_');
    const summary = metrics[key]?.values || {};
    const latency = metrics[`${key}_http_duration`]?.values || {};
    const observedStatus = metrics[`${key}_http_status`]?.values || {};
    const responseChars = metrics[`${key}_response_chars`]?.values || {};
    const count = Number(summary.passes || 0) + Number(summary.fails || 0);
    return {
      ...scenario,
      attempts: count,
      passRate: Number(summary.rate || 0),
      status: count && summary.rate === 1 ? 'PASS' : count ? 'FAIL' : 'NOT RUN',
      observedStatus: { min: observedStatus.min ?? null, median: observedStatus.med ?? null, max: observedStatus.max ?? null },
      latencyMs: { min: latency.min ?? null, avg: latency.avg ?? null, median: latency.med ?? null, p90: latency['p(90)'] ?? null, p95: latency['p(95)'] ?? null, max: latency.max ?? null },
      responseChars: { avg: responseChars.avg ?? null, max: responseChars.max ?? null },
    };
  });
  const logo = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 42 10.5v13.7c0 10.5-7.6 18.2-18 23.3C13.6 42.4 6 34.7 6 24.2V10.5L24 3Z" fill="#eaf7f2"/><circle cx="22" cy="22" r="9" fill="#087f8c" stroke="#72c9bd" stroke-width="2.5"/><path d="m29 29 8 8m-18-15 2 2 4-4" fill="none" stroke="#eaf7f2" stroke-linecap="round" stroke-width="3"/></svg>';
  const rows = results.map((result) => `<tr><td>ProofLens AI · ${result.id}</td><td>${escapeHtml(result.family)}</td><td>${result.method} ${escapeHtml(result.path)}</td><td>${result.expected}</td><td>${result.attempts}</td><td class="${result.status === 'PASS' ? 'pass' : result.status === 'FAIL' ? 'fail' : 'skip'}">${result.status}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProofLens AI · k6 QA Performance</title><style>:root{--ink:#1c3341;--muted:#738791;--line:#e4ecee;--teal:#246b84;--bg:#f5f8f8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{height:72px;background:white;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 max(24px,calc((100% - 1120px)/2));gap:12px}header svg{width:36px;height:36px;background:var(--teal);border-radius:11px;padding:3px}main{max-width:1120px;margin:34px auto;padding:0 24px}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1px;color:#80939b}h1{font-size:28px;letter-spacing:-.8px;margin:4px 0}.muted{color:var(--muted)}.badge{display:inline-block;border-radius:18px;padding:4px 10px;font-weight:800;background:${status === 'PASS' ? '#e8f5ee;color:#317a5a' : '#fff0ed;color:#b24a3c'}}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}.card,.panel{background:white;border:1px solid var(--line);border-radius:12px;padding:17px}.card span{color:var(--muted);font-size:12px}.card strong{display:block;font-size:25px;margin-top:4px}.panel{padding:0;overflow:hidden}.panel h2{font-size:15px;margin:0;padding:16px 18px;border-bottom:1px solid var(--line)}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:12px}th{text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.6px;background:#fbfcfc}td,th{padding:10px 12px;border-bottom:1px solid #eef2f2}.pass{color:#317a5a;font-weight:750}.fail{color:#b24a3c;font-weight:750}.skip{color:#87959c}footer{max-width:1120px;margin:22px auto 35px;padding:0 24px;color:#8a9aa0;font-size:11px}@media(max-width:700px){.cards{grid-template-columns:repeat(2,1fr)}main{margin:22px auto}}</style></head><body><header>${logo}<b>ProofLens AI</b></header><main><span class="eyebrow">PERFORMANCE · 150 AUTHENTICATED FEATURE CASES</span><h1>k6 execution overview</h1><p class="muted">Generated ${escapeHtml(new Date().toISOString())} · Result <span class="badge">${status}</span> · ${vus} virtual users for ${escapeHtml(duration)}</p><section class="cards"><article class="card"><span>Case definitions</span><strong>${results.length}</strong></article><article class="card"><span>Requests</span><strong>${requests}</strong></article><article class="card"><span>Checks</span><strong>${metricValue('checks', 'passes')}/${metricValue('checks', 'passes') + metricValue('checks', 'fails')}</strong></article><article class="card"><span>HTTP p95</span><strong>${p95.toFixed(1)} ms</strong></article></section><section class="cards"><article class="card"><span>Average latency</span><strong>${average.toFixed(1)} ms</strong></article><article class="card"><span>Failed requests</span><strong>${failed}</strong></article><article class="card"><span>Executed cases</span><strong>${results.filter((r) => r.attempts > 0).length}/150</strong></article><article class="card"><span>Pass rate</span><strong>${(checkRate * 100).toFixed(1)}%</strong></article></section><section class="panel"><h2>ProofLens feature matrix and run counts</h2><div class="table-wrap"><table><thead><tr><th>Case</th><th>Feature</th><th>Request</th><th>Expected</th><th>Runs</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section></main><footer>ProofLens AI · Synthetic reserved example data, isolated temporary accounts, and local API only. p95 targets here are QA development gates, not production capacity certification.</footer></body></html>`;
  return {
    'reports/k6-summary.json': JSON.stringify({ metrics: data.metrics, caseResults: results, status, generatedAt: new Date().toISOString(), vus, duration }, null, 2),
    'reports/k6-report.html': html,
    stdout: `ProofLens k6 QA: ${status} · ${requests} requests · ${results.filter((r) => r.attempts > 0).length}/150 cases executed · p95 ${p95.toFixed(1)} ms\n`,
  };
}
