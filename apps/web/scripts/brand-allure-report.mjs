import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const report = resolve('reports/allure-report');
const indexPath = resolve(report, 'index.html');
const summaryPath = resolve(report, 'widgets/summary.json');
const brandMark = resolve('public/prooflens-mark.svg');

const branding = `<style id="prooflens-ai-branding">
:root:not([data-theme="dark"]) {
  --color-intent-primary-bg: var(--prooflens-brand);
  --color-intent-primary-bg-hover: var(--prooflens-brand-hover);
  --color-intent-primary-bg-active: var(--prooflens-brand-hover);
  --color-intent-primary-text: var(--prooflens-brand);
  --color-intent-primary-on-bg: #ffffff;
  --color-nav-item-bg-active: var(--prooflens-brand-soft);
  --color-nav-item-bg-active-hover: var(--prooflens-brand-border);
  --color-nav-item-text-active: var(--prooflens-brand-hover);
  --color-nav-item-icon-active: var(--prooflens-brand-hover);
  --color-sorter-fg-active: var(--prooflens-brand);
  --color-link-text: var(--prooflens-brand);
  --color-link-text-hover: var(--prooflens-brand-hover);
  --color-focus-ring: var(--prooflens-header-accent);
}
:root[data-theme="dark"] {
  --color-intent-primary-bg: #48c2bd;
  --color-intent-primary-bg-hover: #62d1cb;
  --color-intent-primary-bg-active: #83dfd8;
  --color-intent-primary-text: #6bd0cb;
  --color-intent-primary-on-bg: #07383f;
  --color-nav-item-bg-active: #164c52;
  --color-nav-item-bg-active-hover: #205c62;
  --color-nav-item-text-active: #8be0db;
  --color-nav-item-icon-active: #8be0db;
  --color-sorter-fg-active: #8be0db;
  --color-link-text: #71d5d0;
  --color-link-text-hover: #a1eeea;
  --color-focus-ring: #58c8c2;
}
.prooflens-report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  color: #f5ffff !important;
  background: linear-gradient(105deg, var(--prooflens-header-start, #102c3d) 0%, var(--prooflens-header-middle, #0c5962) 58%, var(--prooflens-header-end, #087f8c) 100%) !important;
  border-bottom: 3px solid var(--prooflens-header-accent, #59c9c1) !important;
  box-shadow: 0 4px 18px rgba(8, 65, 76, .16);
  min-height: 82px;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px max(16px, calc((100% - 1440px) / 2));
}
.prooflens-report-identity {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  flex: 0 0 auto;
  color: #f5ffff;
  white-space: normal;
}
.prooflens-report-identity img { width: 34px; height: 34px; }
.prooflens-report-identity-copy { display: flex; flex-direction: column; gap: 2px; }
.prooflens-report-name { font-size: 15px; font-weight: 850; letter-spacing: .01em; }
.prooflens-report-subtitle { display: block; color: #c7e8e9; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.prooflens-report-owner { display: block; margin-top: 3px; color: #fff; font-size: 11px; font-weight: 750; letter-spacing: .01em; }
.prooflens-report-role { display: block; color: #c7e8e9; font-size: 9px; font-weight: 600; }
.prooflens-report-categories {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 500px;
  flex-wrap: wrap;
}
.prooflens-report-category {
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  color: #f5ffff;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.28);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color .15s ease, transform .15s ease;
}
.prooflens-report-category:hover, .prooflens-report-category:focus-visible {
  color: #fff;
  background: rgba(255,255,255,.27);
  transform: translateY(-1px);
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.prooflens-report-left { display: flex; align-items: center; flex-wrap: wrap; gap: 15px; }
.prooflens-report-theme { display: grid; gap: 3px; color: #d8eef0; font-size: 9px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.prooflens-report-theme select {
  min-width: 144px;
  padding: 6px 26px 6px 9px;
  color: #fff;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.4);
  border-radius: 7px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
}
.prooflens-report-theme select:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.prooflens-report-theme option { color: #172b3a; background: #fff; }
.prooflens-report-k6::after { content: ' ↗'; font-size: 10px; }
:root { --prooflens-brand:#087f8c; --prooflens-brand-hover:#066b75; --prooflens-brand-soft:#dff2f1; --prooflens-brand-border:#c9e8e7; --prooflens-header-start:#102c3d; --prooflens-header-middle:#0c5962; --prooflens-header-end:#087f8c; --prooflens-header-accent:#59c9c1; }
:root[data-prooflens-theme="dark-grey"] { --prooflens-brand:#4b5563; --prooflens-brand-hover:#374151; --prooflens-brand-soft:#e5e7eb; --prooflens-brand-border:#d1d5db; --prooflens-header-start:#111827; --prooflens-header-middle:#374151; --prooflens-header-end:#4b5563; --prooflens-header-accent:#9ca3af; }
:root[data-prooflens-theme="green"] { --prooflens-brand:#16803c; --prooflens-brand-hover:#116534; --prooflens-brand-soft:#dcfce7; --prooflens-brand-border:#bbf7d0; --prooflens-header-start:#12382b; --prooflens-header-middle:#16734b; --prooflens-header-end:#16803c; --prooflens-header-accent:#86efac; }
:root[data-prooflens-theme="red"] { --prooflens-brand:#dc2626; --prooflens-brand-hover:#b91c1c; --prooflens-brand-soft:#fee2e2; --prooflens-brand-border:#fecaca; --prooflens-header-start:#3f151d; --prooflens-header-middle:#9f1239; --prooflens-header-end:#dc2626; --prooflens-header-accent:#fda4af; }
:root[data-prooflens-theme="blue"] { --prooflens-brand:#2563eb; --prooflens-brand-hover:#1d4ed8; --prooflens-brand-soft:#dbeafe; --prooflens-brand-border:#bfdbfe; --prooflens-header-start:#102c3d; --prooflens-header-middle:#1d4ed8; --prooflens-header-end:#2563eb; --prooflens-header-accent:#93c5fd; }
:root[data-prooflens-theme="high-contrast-blue"] { --prooflens-brand:#0047ab; --prooflens-brand-hover:#002b70; --prooflens-brand-soft:#dbeafe; --prooflens-brand-border:#93c5fd; --prooflens-header-start:#050b18; --prooflens-header-middle:#002b70; --prooflens-header-end:#0047ab; --prooflens-header-accent:#ffeb3b; }
:root[data-prooflens-theme="purple"] { --prooflens-brand:#9333ea; --prooflens-brand-hover:#6b21a8; --prooflens-brand-soft:#f3e8ff; --prooflens-brand-border:#e9d5ff; --prooflens-header-start:#291344; --prooflens-header-middle:#6b21a8; --prooflens-header-end:#9333ea; --prooflens-header-accent:#d8b4fe; }
:root[data-prooflens-theme="amber"] { --prooflens-brand:#d97706; --prooflens-brand-hover:#a84c10; --prooflens-brand-soft:#fef3c7; --prooflens-brand-border:#fde68a; --prooflens-header-start:#422006; --prooflens-header-middle:#a84c10; --prooflens-header-end:#d97706; --prooflens-header-accent:#fde68a; }
@media (max-width: 760px) {
  .prooflens-report-header { align-items: flex-start; }
  .prooflens-report-categories { flex-basis: 100%; }
}
.prooflens-report-graph-content { box-sizing:border-box; min-height:245px; padding:22px 22px 28px; color:#536273; font-size:12px; }
.prooflens-report-graph-value { margin:6px 0 18px; color:#172b3a; font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; }
.prooflens-report-graph-value--blue { color:#1d4ed8; }
.prooflens-report-graph-track { position:relative; height:15px; overflow:hidden; border-radius:99px; background:#e5ebf0; }
.prooflens-report-graph-fill { height:100%; min-width:0; border-radius:inherit; background:linear-gradient(90deg,#60a5fa,#1d4ed8); }
.prooflens-report-graph-fill--green { background:#22c55e; }
.prooflens-report-graph-fill--amber { background:#f59e0b; }
.prooflens-report-graph-fill--red { background:#ef4444; }
.prooflens-report-graph-zero-marker { position:absolute; inset:0 auto 0 0; width:3px; background:#d97706; }
.prooflens-report-graph-axis { display:flex; justify-content:space-between; margin-top:7px; color:#718096; font-size:10px; }
.prooflens-report-graph-note { margin-top:12px; color:#627589; font-size:11px; }
.prooflens-report-graph-status-list { display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:12px; font-size:11px; }
.prooflens-report-graph-status-list span { white-space:nowrap; }
.prooflens-report-graph-status-list .passed { color:#16803c; }
.prooflens-report-graph-status-list .failed { color:#dc2626; }
.prooflens-report-graph-status-list .broken { color:#d97706; }
.prooflens-report-graph-status-list .skipped { color:#64748b; }
.prooflens-report-graph-status-list .unknown { color:#7c3aed; }
.prooflens-report-graph-empty { display:flex; align-items:center; min-height:120px; color:#627589; }
.prooflens-report-overview-categories { display:grid; gap:0; padding:8px 18px 14px; }
.prooflens-report-overview-category { display:grid; grid-template-columns:minmax(150px,1fr) minmax(90px,1.3fr) auto; align-items:center; gap:12px; min-height:43px; color:#273746; text-decoration:none; border-bottom:1px solid #e8edf1; font-size:12px; }
.prooflens-report-overview-category:hover { color:#087f8c; }
.prooflens-report-overview-category-name { font-weight:650; }
.prooflens-report-overview-category-count { color:#536273; font-size:11px; white-space:nowrap; }
.prooflens-report-overview-track { height:8px; overflow:hidden; border-radius:99px; background:#e5ebf0; }
.prooflens-report-overview-fill { height:100%; border-radius:inherit; background:#22c55e; }
.prooflens-report-overview-note { margin:8px 0 0; color:#627589; font-size:10px; }
.prooflens-report-executor-list { display:grid; grid-template-columns:minmax(110px,.8fr) 1.4fr; gap:0; margin-top:10px; }
.prooflens-report-executor-list span { padding:9px 0; border-bottom:1px solid #e8edf1; overflow-wrap:anywhere; }
.prooflens-report-executor-list span:nth-child(odd) { color:#627589; }
.prooflens-report-category-browser { box-sizing:border-box; height:100%; overflow:auto; padding:28px 32px; color:#273746; }
.prooflens-report-category-browser h1 { margin:0; font-size:22px; }
.prooflens-report-category-browser > p { margin:7px 0 20px; color:#627589; font-size:13px; }
.prooflens-report-category-browser .prooflens-report-overview-categories { max-width:1000px; padding:0; }
.prooflens-report-category-browser .prooflens-report-overview-category { min-height:56px; font-size:14px; }
.prooflens-report-category-browser .prooflens-report-overview-category-count { font-size:12px; }
@media (max-width: 760px) { .prooflens-report-graph-content { padding:16px; } }
</style>`;

const suites = JSON.parse(await readFile(resolve(report, 'widgets/suites.json'), 'utf8'));
const suiteTree = JSON.parse(await readFile(resolve(report, 'data/suites.json'), 'utf8'));
const environment = JSON.parse(await readFile(resolve(report, 'widgets/environment.json'), 'utf8'));
const trendData = Object.fromEntries(await Promise.all(['history-trend', 'duration-trend', 'retry-trend'].map(async (name) => [
  name,
  JSON.parse(await readFile(resolve(report, `widgets/${name}.json`), 'utf8')),
])));
const categoriesMarkup = suites.items.map((suite) => {
  const isK6 = suite.name === 'k6 Performance';
  const href = isK6 ? '../k6-cases-report.html' : `#suites/${encodeURIComponent(suite.uid)}`;
  const extra = isK6 ? ' target="_blank" rel="noreferrer" class="prooflens-report-category prooflens-report-k6"' : ' class="prooflens-report-category"';
  const aria = isK6 ? `Open ${suite.name} in a new report` : `Open ${suite.name} cases in the Allure report`;
  return `<a${extra} href="${href}" aria-label="${aria}">${escapeHtml(suite.name)} · ${suite.statistic.total}</a>`;
}).join('\n    ');

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

const historyTrend = trendData['history-trend'];
const durationTrend = trendData['duration-trend'];
const retryTrend = trendData['retry-trend'];
const historyCount = historyTrend.length;
const categoryTrend = JSON.parse(await readFile(resolve(report, 'widgets/categories-trend.json'), 'utf8'));
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
let smokeCount = 0;
const countSmokeCases = (node) => {
  if (node.uid && node.status && /smoke/i.test(node.name || '')) smokeCount += 1;
  for (const child of node.children || []) countSmokeCases(child);
};
countSmokeCases(suiteTree);
const latestStatuses = historyTrend.at(-1)?.data || summary.statistic;
const latestTotal = latestStatuses.total || summary.statistic.total;
const latestDuration = Number(durationTrend.at(-1)?.data?.duration ?? summary.time.duration);
const latestRetries = Number(retryTrend.at(-1)?.data?.retry ?? 0);
const currentDefectCount = Object.values(categoryTrend.at(-1)?.data || {}).reduce((total, value) => total + Number(value || 0), 0);
const formatDuration = (milliseconds) => `${Math.floor(milliseconds / 60000)}m ${((milliseconds % 60000) / 1000).toFixed(1)}s`;
const bar = (value, scale, colorClass, label) => `<div class="prooflens-report-graph-track" role="img" aria-label="${escapeHtml(label)}"><div class="prooflens-report-graph-fill ${colorClass}" style="width:${Math.max(value > 0 ? 1 : 0, Math.min(100, scale ? value / scale * 100 : 0))}%"></div>${value === 0 ? '<span class="prooflens-report-graph-zero-marker" aria-hidden="true"></span>' : ''}</div>`;
const durationWidgetHtml = `<div class="prooflens-report-graph-value prooflens-report-graph-value--blue">${formatDuration(latestDuration)}</div>${bar(latestDuration, 30 * 60 * 1000, '', `Duration ${formatDuration(latestDuration)}`)}<div class="prooflens-report-graph-axis"><span>0 min</span><span>15 min</span><span>30 min</span></div><p class="prooflens-report-graph-note">Latest run · ${historyCount} saved report ${historyCount === 1 ? 'run' : 'runs'}</p>`;
const retryWidgetHtml = `<div class="prooflens-report-graph-value">${latestRetries} retries</div>${bar(latestRetries, latestTotal, 'prooflens-report-graph-fill--amber', `${latestRetries} retries out of ${latestTotal} test cases`)}<div class="prooflens-report-graph-axis"><span>0</span><span>${latestTotal} test cases</span></div><p class="prooflens-report-graph-note">Latest saved run; earlier-run history is shown when available.</p>`;
const resultStatuses = ['passed', 'failed', 'broken', 'skipped', 'unknown'];
const resultColors = { passed: '#22c55e', failed: '#ef4444', broken: '#f59e0b', skipped: '#94a3b8', unknown: '#8b5cf6' };
const resultBars = resultStatuses.map((status) => `<div class="prooflens-report-graph-fill" title="${status}: ${latestStatuses[status] || 0}" style="width:${latestTotal ? (latestStatuses[status] || 0) / latestTotal * 100 : 0}%;background:${resultColors[status]}"></div>`).join('');
const resultWidgetHtml = `<div class="prooflens-report-graph-value">${latestStatuses.passed || 0} / ${latestTotal} passed</div><div class="prooflens-report-graph-track" role="img" aria-label="Latest run results by status" style="display:flex">${resultBars}</div><div class="prooflens-report-graph-status-list">${resultStatuses.map((status) => `<span class="${status}">${status} ${latestStatuses[status] || 0}</span>`).join('')}</div><p class="prooflens-report-graph-note">${historyCount} saved report ${historyCount === 1 ? 'run' : 'runs'}; previous run data is not present.</p>`;
const categoryWidgetHtml = currentDefectCount
  ? `<div class="prooflens-report-graph-value">${currentDefectCount} defect categories</div><p class="prooflens-report-graph-note">Category counts are from the latest saved run.</p>`
  : `<div class="prooflens-report-graph-value">0 defect categories</div>${bar(0, 1, 'prooflens-report-graph-fill--red', 'No defect categories in this run')}<div class="prooflens-report-graph-axis"><span>0 · latest run</span><span>${latestTotal} test cases</span></div><p class="prooflens-report-graph-note">No failed or broken tests were recorded, so there are no defect categories to plot.</p>`;
const trendWidgetHtml = {
  'duration-trend': durationWidgetHtml,
  'retry-trend': retryWidgetHtml,
  'history-trend': resultWidgetHtml,
  'categories-trend': categoryWidgetHtml,
};
const overviewCategoryRows = suites.items.map((suite) => {
  const isK6 = suite.name === 'k6 Performance';
  const href = isK6 ? '../k6-cases-report.html' : `#suites/${encodeURIComponent(suite.uid)}`;
  const target = isK6 ? ' target="_blank" rel="noreferrer"' : '';
  const passRate = suite.statistic.total ? (suite.statistic.passed / suite.statistic.total * 100) : 0;
  return `<a class="prooflens-report-overview-category" href="${href}"${target}><span class="prooflens-report-overview-category-name">${escapeHtml(suite.name)}</span><span class="prooflens-report-overview-track"><span class="prooflens-report-overview-fill" style="display:block;width:${passRate}%"></span></span><span class="prooflens-report-overview-category-count">${suite.statistic.total} cases</span></a>`;
}).join('');
const uiSuite = suites.items.find((suite) => suite.name === 'UI Tests');
const smokeRow = uiSuite ? `<a class="prooflens-report-overview-category" href="#suites/${encodeURIComponent(uiSuite.uid)}"><span class="prooflens-report-overview-category-name">Smoke · UI subset</span><span class="prooflens-report-overview-track"><span class="prooflens-report-overview-fill" style="display:block;width:${uiSuite.statistic.total ? smokeCount / uiSuite.statistic.total * 100 : 0}%"></span></span><span class="prooflens-report-overview-category-count">${smokeCount} cases</span></a>` : '';
const overviewCategoriesHtml = `<div class="prooflens-report-overview-categories">${overviewCategoryRows}${smokeRow}<p class="prooflens-report-overview-note">Smoke tests are included in UI Tests; System + Integration is a separate suite.</p></div>`;
const categoriesPageHtml = `<section class="prooflens-report-category-browser"><h1>Test categories</h1><p>All test groups in this run. Click a row to open its cases; k6 opens its separate performance report.</p>${overviewCategoriesHtml}</section>`;
const overviewTrendHtml = `<div class="prooflens-report-graph-value">${latestStatuses.passed || 0} / ${latestTotal} passed</div><div class="prooflens-report-graph-track" role="img" aria-label="Latest run result distribution" style="display:flex">${resultBars}</div><div class="prooflens-report-graph-status-list">${resultStatuses.map((status) => `<span class="${status}">${status} ${latestStatuses[status] || 0}</span>`).join('')}</div><p class="prooflens-report-graph-note">Latest saved run · ${historyCount} run in report history.</p>`;
const executorRows = environment.map(({ name, values }) => `<span>${escapeHtml(name)}</span><span>${escapeHtml(values.join(', '))}</span>`).join('');
const overviewExecutorsHtml = `<p class="prooflens-report-graph-note">No CI executor metadata was attached to this run. The recorded execution environment is shown below.</p><div class="prooflens-report-executor-list">${executorRows}</div>`;
const overviewWidgetHtml = { categories: overviewCategoriesHtml, 'history-trend': overviewTrendHtml, executors: overviewExecutorsHtml };

const reportHeader = `<header class="prooflens-report-header" aria-label="ProofLens QA report">
  <div class="prooflens-report-left">
    <div class="prooflens-report-identity">
      <img src="prooflens-mark.svg" alt="ProofLens logo">
      <span class="prooflens-report-identity-copy">
        <span class="prooflens-report-name">ProofLens AI</span>
        <small class="prooflens-report-subtitle">QA Automation Report</small>
        <span class="prooflens-report-owner">Raja Haroon Jamal</span>
        <small class="prooflens-report-role">Full Stack QA Engineer · Department: QA</small>
      </span>
    </div>
    <label class="prooflens-report-theme" for="prooflens-report-theme">Header color
      <select id="prooflens-report-theme" aria-label="Choose report header color">
        <option value="prooflens">ProofLens teal</option>
        <option value="dark-grey">Dark grey</option>
        <option value="green">Green</option>
        <option value="red">Red</option>
        <option value="blue">Blue</option>
        <option value="high-contrast-blue">High contrast blue</option>
        <option value="purple">Purple</option>
        <option value="amber">Amber</option>
      </select>
    </label>
  </div>
  <nav class="prooflens-report-categories" aria-label="All QA test categories and case counts">
    ${categoriesMarkup}
  </nav>
</header>`;

const themeScript = `<script id="prooflens-report-theme-script">
(() => {
  const select = document.getElementById('prooflens-report-theme');
  if (!select) return;
  const allowed = new Set([...select.options].map(option => option.value));
  const storageKey = 'prooflens-report-theme';
  const apply = value => {
    const theme = allowed.has(value) ? value : 'prooflens';
    document.documentElement.dataset.prooflensTheme = theme;
    select.value = theme;
  };
  try { apply(localStorage.getItem(storageKey) || localStorage.getItem('prooflens-allure-header-theme') || 'prooflens'); } catch { apply('prooflens'); }
  select.addEventListener('change', () => {
    apply(select.value);
    try { localStorage.setItem(storageKey, select.value); } catch { /* Theme still applies for this page. */ }
  });
  window.addEventListener('storage', event => { if (event.key === storageKey) apply(event.newValue); });
  if (new URLSearchParams(location.search).get('view') === 'trends') window.addEventListener('load', () => { location.hash = 'graph'; });
})();
</script>`;

const graphEnhancementScript = `<script id="prooflens-report-graph-enhancement">
(() => {
  const graphWidgets = ${JSON.stringify(trendWidgetHtml)};
  const overviewWidgets = ${JSON.stringify(overviewWidgetHtml)};
  const categoriesPage = ${JSON.stringify(categoriesPageHtml)};
  let scheduled = false;
  const install = () => {
    const route = location.hash.split('/')[0];
    if (route === '#categories') {
      const content = document.querySelector('.app__content');
      if (content && !content.querySelector('.prooflens-report-category-browser')) content.innerHTML = categoriesPage;
      return;
    }
    const isOverview = route === '' || route === '#';
    const targets = route === '#graph' ? graphWidgets : isOverview ? overviewWidgets : null;
    if (!targets) return;
    for (const [id, content] of Object.entries(targets)) {
      const body = document.querySelector('.widget[data-id="' + id + '"] .widget__body');
      const marker = route + ':' + id;
      if (!body || (body.dataset.prooflensEnhanced === marker && body.querySelector('.prooflens-report-graph-content'))) continue;
      const overviewTitles = { categories: 'Categories · test groups', executors: 'Executors · run environment' };
      const title = isOverview && overviewTitles[id] ? overviewTitles[id] : body.querySelector('.widget__title')?.textContent || id;
      body.innerHTML = '<h2 class="widget__title">' + title + '</h2><div class="prooflens-report-graph-content">' + content + '</div>';
      body.dataset.prooflensEnhanced = marker;
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; install(); });
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', schedule);
  schedule();
})();
</script>`;

let html = await readFile(indexPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>ProofLens AI · QA Automation Report</title>');
html = html.replace(/<link rel="icon" href="[^"]*">/, '<link rel="icon" href="prooflens-mark.svg">');
html = html.replace(/<style id="prooflens-ai-branding">[\s\S]*?<\/style>/, '');
html = html.replace(/<script id="prooflens-ai-header-enhancement">[\s\S]*?<\/script>/, '');
html = html.replace(/<script id="prooflens-report-theme-script">[\s\S]*?<\/script>/, '');
html = html.replace(/<script id="prooflens-report-graph-enhancement">[\s\S]*?<\/script>/, '');
html = html.replace(/<header class="prooflens-report-header"[\s\S]*?<\/header>/, '');
html = html.replace(/<section class="prooflens-report-dashboard"[\s\S]*?<\/section>/, '');
html = html.replace(/<section class="prooflens-report-trends"[\s\S]*?<\/section>/, '');
html = html.replace('<!-- allure-core-head:start -->', `${branding}\n    <!-- allure-core-head:start -->`);
html = html.replace('<body>', `<body>\n${reportHeader}\n${themeScript}\n${graphEnhancementScript}`);
await writeFile(indexPath, html);
await copyFile(brandMark, resolve(report, 'prooflens-mark.svg'));

summary.reportName = 'ProofLens AI · QA Automation';
await writeFile(summaryPath, JSON.stringify(summary, null, 2));
console.log('ProofLens AI branding applied to Allure report.');
