import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reports = resolve(root, 'reports');
const resultPath = resolve(reports, 'test-results.json');
const logoPath = resolve(root, 'public/prooflens-mark.svg');

function flattenSuites(suites, inheritedFile = '') {
  return suites.flatMap((suite) => {
    const file = suite.file || inheritedFile;
    const specs = (suite.specs || []).map((spec) => ({ ...spec, file: spec.file || file }));
    return [...specs, ...flattenSuites(suite.suites || [], file)];
  });
}

function classify(spec) {
  const file = (spec.file || '').toLowerCase();
  if (file.includes('api.spec') || file.includes('api-matrix.spec') || file.includes('api-feature-flows.spec')) return 'API';
  if (file.includes('.bdd-generated') || file.includes('.features-gen')) return 'BDD';
  if (file.includes('system-integration')) return 'SYSTEM';
  return 'UI';
}

function finalStatus(spec) {
  const statuses = (spec.tests || []).flatMap((test) => test.results || []).map((result) => result.status);
  const last = statuses.at(-1);
  if (last === 'failed' || last === 'timedOut' || last === 'skipped') return last;
  return last === 'passed' || spec.ok ? 'passed' : 'skipped';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function duration(spec) {
  return (spec.tests || []).flatMap((test) => test.results || []).reduce((total, result) => total + (result.duration || 0), 0);
}

function count(items) {
  return {
    total: items.length,
    passed: items.filter((item) => item.status === 'passed').length,
    failed: items.filter((item) => ['failed', 'timedOut'].includes(item.status)).length,
    skipped: items.filter((item) => item.status === 'skipped').length,
  };
}

function timeLabel(ms) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function pageHTML(title, items, allItems, generatedAt, links = true) {
  const totals = count(items);
  const success = totals.total ? Math.round(totals.passed / totals.total * 100) : 0;
  const rows = items.map((item) => `<tr><td><span class="status ${item.status}">${escapeHTML(item.status.toUpperCase())}</span></td><td><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.file)}</small></td><td>${timeLabel(item.duration)}</td></tr>`).join('');
  const groups = ['UI', 'API', 'BDD', 'SYSTEM', 'K6'].map((name) => {
    const suite = allItems.filter((item) => item.group === name);
    const stats = count(suite);
    const label = ({ BDD: 'BDD SCENARIOS', SYSTEM: 'SYSTEM + INTEGRATION', K6: 'K6 PERFORMANCE' })[name] || `${name} TESTS`;
    return `<article class="suite"><span class="eyebrow">${label}</span><strong>${stats.total}</strong><div>${stats.passed} passed · ${stats.failed} failed · ${stats.skipped} skipped</div></article>`;
  }).join('');
  const linksOut = `<a href="ui-report.html">UI</a><a href="api-report.html">API</a><a href="bdd-report.html">BDD</a><a href="system-integration-report.html">System + integration</a><a href="k6-cases-report.html">k6 cases</a><a href="follow-up-verification.json">Follow-up verification</a><a href="playwright-html/index.html">Playwright details</a><a href="allure-report/index.html">Allure</a><a href="cucumber-report.html">Gherkin details</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(title)}</title><style>
  :root{color-scheme:light;--ink:#1c3341;--muted:#738791;--line:#e4ecee;--teal:#246b84;--mint:#e7f4ee;--bg:#f5f8f8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}header{height:72px;background:white;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 max(24px,calc((100% - 1120px)/2));gap:12px}header img{width:35px;height:35px}header b{font-size:16px;letter-spacing:-.3px}main{max-width:1120px;margin:36px auto;padding:0 24px}.eyebrow{color:#80939b;font-size:10px;font-weight:750;letter-spacing:1.2px}.intro{display:flex;align-items:end;justify-content:space-between;gap:24px}.intro h1{font-size:28px;letter-spacing:-.9px;margin:5px 0}.intro p{margin:5px 0;color:var(--muted)}.date{color:var(--muted);font-size:12px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0 14px}.stat,.suite,.panel{background:white;border:1px solid var(--line);border-radius:12px;padding:17px}.stat span{color:var(--muted);font-size:12px}.stat strong{display:block;font-size:26px;margin-top:3px}.passbar{height:8px;border-radius:9px;background:#e8eeee;overflow:hidden;margin:10px 0 26px}.passbar i{display:block;width:${success}%;height:100%;background:#4a9b7d}.suite-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}.suite strong{display:block;font-size:27px;margin:8px 0 3px}.suite div{color:var(--muted);font-size:12px}.panel{padding:0;overflow:hidden}.panel-head{padding:18px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between}.panel-head h2{font-size:15px;margin:0}.panel-head a,.links a{color:var(--teal);text-decoration:none;font-weight:650;font-size:12px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:11px 18px;color:var(--muted);font-size:10px;letter-spacing:.7px;text-transform:uppercase;background:#fbfcfc}td{padding:12px 18px;border-top:1px solid #eef2f2;vertical-align:top}td small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.status{display:inline-block;border-radius:20px;padding:3px 8px;font-size:9px;font-weight:800;letter-spacing:.5px}.status.passed{background:#e8f5ee;color:#317a5a}.status.failed,.status.timedOut{background:#fff0ed;color:#b24a3c}.status.skipped{background:#f1f3f4;color:#72818a}.links{display:flex;gap:18px;flex-wrap:wrap;margin:18px 0}.empty{padding:32px;text-align:center;color:var(--muted)}footer{max-width:1120px;margin:24px auto 40px;padding:0 24px;color:#8a9aa0;font-size:11px}@media(max-width:900px){.suite-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){main{margin:22px auto}.intro{display:block}.date{margin-top:12px}.stats{grid-template-columns:repeat(2,1fr)}.suite-grid{grid-template-columns:1fr}.panel{overflow-x:auto}table{min-width:620px}}
  </style></head><body><header><img src="prooflens-mark.svg" alt=""><b>ProofLens AI</b></header><main><div class="intro"><div><span class="eyebrow">AUTOMATION OVERVIEW</span><h1>${escapeHTML(title)}</h1><p>265 UI · 125 API · 120 BDD · 150 authenticated k6 feature cases · 100 system integration cases.</p></div><time class="date">Generated ${escapeHTML(generatedAt)}</time></div><section class="stats"><article class="stat"><span>Total cases</span><strong>${totals.total}</strong></article><article class="stat"><span>Passed</span><strong>${totals.passed}</strong></article><article class="stat"><span>Failed</span><strong>${totals.failed}</strong></article><article class="stat"><span>Pass rate</span><strong>${success}%</strong></article></section><div class="passbar" aria-label="${success}% passed"><i></i></div><section class="suite-grid">${groups}</section><section class="panel"><div class="panel-head"><h2>Overview · Test cases</h2>${links ? `<a href="index.html">All suites</a>` : ''}</div>${rows ? `<table><thead><tr><th>Status</th><th>Test case</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">No test results in this report yet. Run the automation suite to populate this overview.</div>'}</section><nav class="links">${links ? linksOut : ''}</nav></main><footer>ProofLens AI · Each case uses test-only data. User and scan records are removed by suite teardown.</footer></body></html>`;
}

await mkdir(reports, { recursive: true });
await writeFile(resolve(reports, 'prooflens-mark.svg'), await readFile(logoPath));
let data;
try { data = JSON.parse(await readFile(resultPath, 'utf8')); }
catch { data = { suites: [] }; }
const generatedAt = new Date().toLocaleString();
const playwrightCases = flattenSuites(data.suites || []).map((spec) => ({
  title: spec.title || 'Unnamed test', file: spec.file || '', status: finalStatus(spec), duration: duration(spec), group: classify(spec),
}));
let k6Cases = [];
try {
  const summary = JSON.parse(await readFile(resolve(reports, 'k6-summary.json'), 'utf8'));
  k6Cases = (summary.caseResults || []).map((scenario) => ({
    title: `ProofLens AI · ${scenario.id} · ${scenario.family} · ${scenario.method} ${scenario.path} · ${scenario.attempts} runs`,
    file: 'performance/k6/prooflens-matrix.js',
    status: scenario.status === 'PASS' ? 'passed' : scenario.status === 'FAIL' ? 'failed' : 'skipped',
    duration: 0,
    group: 'K6',
  }));
} catch { /* k6 may not have been run for a Playwright-only report build. */ }
const cases = [...playwrightCases, ...k6Cases];
const ui = cases.filter(({ group }) => group === 'UI');
const api = cases.filter(({ group }) => group === 'API');
const bdd = cases.filter(({ group }) => group === 'BDD');
const system = cases.filter(({ group }) => group === 'SYSTEM');
const k6 = cases.filter(({ group }) => group === 'K6');
await writeFile(resolve(reports, 'index.html'), pageHTML('ProofLens AI · Test Run Overview', cases, cases, generatedAt));
await writeFile(resolve(reports, 'ui-report.html'), pageHTML('ProofLens AI · UI Smoke, Regression & Negative', ui, cases, generatedAt));
await writeFile(resolve(reports, 'api-report.html'), pageHTML('ProofLens AI · API Report', api, cases, generatedAt));
await writeFile(resolve(reports, 'bdd-report.html'), pageHTML('ProofLens AI · Gherkin BDD Report', bdd, cases, generatedAt));
await writeFile(resolve(reports, 'system-integration-report.html'), pageHTML('ProofLens AI · System & Integration Report', system, cases, generatedAt));
await writeFile(resolve(reports, 'k6-cases-report.html'), pageHTML('ProofLens AI · k6 Performance Cases', k6, cases, generatedAt));
console.log(`ProofLens automation reports: ${cases.length} total (${ui.length} UI, ${api.length} API, ${bdd.length} BDD, ${k6.length} k6, ${system.length} system/integration).`);
