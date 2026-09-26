import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = [
  'reports/index.html',
  'reports/ui-report.html',
  'reports/api-report.html',
  'reports/bdd-report.html',
  'reports/system-integration-report.html',
  'reports/k6-cases-report.html',
  'reports/k6-report.html',
];

const style = `<style id="prooflens-ai-report-branding">
:root { --teal: var(--prooflens-brand); --ink: #153244; --bg: #f2f7f7; --line: #dce9e9; --prooflens-brand:#087f8c; --prooflens-brand-hover:#066b75; --prooflens-brand-soft:#dff2f1; --prooflens-brand-border:#c9e8e7; --prooflens-header-start:#102c3d; --prooflens-header-middle:#0c5962; --prooflens-header-end:#087f8c; --prooflens-header-accent:#59c9c1; }
:root[data-prooflens-theme="dark-grey"] { --prooflens-brand:#4b5563; --prooflens-brand-hover:#374151; --prooflens-brand-soft:#e5e7eb; --prooflens-brand-border:#d1d5db; --prooflens-header-start:#111827; --prooflens-header-middle:#374151; --prooflens-header-end:#4b5563; --prooflens-header-accent:#9ca3af; }
:root[data-prooflens-theme="green"] { --prooflens-brand:#16803c; --prooflens-brand-hover:#116534; --prooflens-brand-soft:#dcfce7; --prooflens-brand-border:#bbf7d0; --prooflens-header-start:#12382b; --prooflens-header-middle:#16734b; --prooflens-header-end:#16803c; --prooflens-header-accent:#86efac; }
:root[data-prooflens-theme="red"] { --prooflens-brand:#dc2626; --prooflens-brand-hover:#b91c1c; --prooflens-brand-soft:#fee2e2; --prooflens-brand-border:#fecaca; --prooflens-header-start:#3f151d; --prooflens-header-middle:#9f1239; --prooflens-header-end:#dc2626; --prooflens-header-accent:#fda4af; }
:root[data-prooflens-theme="blue"] { --prooflens-brand:#2563eb; --prooflens-brand-hover:#1d4ed8; --prooflens-brand-soft:#dbeafe; --prooflens-brand-border:#bfdbfe; --prooflens-header-start:#102c3d; --prooflens-header-middle:#1d4ed8; --prooflens-header-end:#2563eb; --prooflens-header-accent:#93c5fd; }
:root[data-prooflens-theme="high-contrast-blue"] { --prooflens-brand:#0047ab; --prooflens-brand-hover:#002b70; --prooflens-brand-soft:#dbeafe; --prooflens-brand-border:#93c5fd; --prooflens-header-start:#050b18; --prooflens-header-middle:#002b70; --prooflens-header-end:#0047ab; --prooflens-header-accent:#ffeb3b; }
:root[data-prooflens-theme="purple"] { --prooflens-brand:#9333ea; --prooflens-brand-hover:#6b21a8; --prooflens-brand-soft:#f3e8ff; --prooflens-brand-border:#e9d5ff; --prooflens-header-start:#291344; --prooflens-header-middle:#6b21a8; --prooflens-header-end:#9333ea; --prooflens-header-accent:#d8b4fe; }
:root[data-prooflens-theme="amber"] { --prooflens-brand:#d97706; --prooflens-brand-hover:#a84c10; --prooflens-brand-soft:#fef3c7; --prooflens-brand-border:#fde68a; --prooflens-header-start:#422006; --prooflens-header-middle:#a84c10; --prooflens-header-end:#d97706; --prooflens-header-accent:#fde68a; }
body { background: linear-gradient(180deg, color-mix(in srgb, var(--prooflens-brand-soft) 68%, white) 0, #f5f8f8 260px, #f5f8f8 100%); }
header { color: #f5ffff !important; background: linear-gradient(105deg, var(--prooflens-header-start) 0%, var(--prooflens-header-middle) 58%, var(--prooflens-header-end) 100%) !important; border-bottom: 3px solid var(--prooflens-header-accent) !important; box-shadow: 0 4px 18px rgba(8,65,76,.16); }
header b { color: #f5ffff !important; letter-spacing: .02em; }
header img { background: rgba(255,255,255,.12); border-radius: 10px; padding: 3px; }
header svg { background: #087f8c !important; border: 1px solid rgba(255,255,255,.35); }
.panel h2, .panel-head h2 { color: #153244; }
a { color: var(--prooflens-brand); }
@media (prefers-reduced-motion: no-preference) { .stat, .suite, .card { transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; } .stat:hover, .suite:hover, .card:hover { border-color: #8bcac6; box-shadow: 0 8px 22px rgba(10,84,91,.08); transform: translateY(-2px); } }
.prooflens-k6-header { height:auto !important; min-height:82px; width:100%; display:grid; grid-template-columns:minmax(210px,1fr) minmax(235px,auto) auto; align-items:center; gap:18px; padding:10px max(20px,calc((100% - 1480px)/2)); }
.prooflens-k6-brand { display:flex; align-items:center; gap:11px; min-width:0; color:#f5ffff !important; text-decoration:none; }
.prooflens-k6-brand img { display:block; width:40px; height:40px; padding:4px; border:1px solid rgba(255,255,255,.3); border-radius:11px; background:rgba(255,255,255,.12); }
.prooflens-k6-brand-copy { display:grid; gap:1px; }
.prooflens-k6-brand-copy b { color:#fff; font-size:15px; letter-spacing:.01em; }
.prooflens-k6-brand-copy small { color:#c7e8e9; font-size:9px; font-weight:700; letter-spacing:.11em; text-transform:uppercase; }
.prooflens-k6-owner { display:grid; gap:2px; padding-left:16px; border-left:1px solid rgba(255,255,255,.28); }
.prooflens-k6-owner > span { display:grid; gap:2px; }
.prooflens-k6-owner b { color:#fff; font-size:11px; }
.prooflens-k6-owner small { color:#c7e8e9; font-size:9px; }
.prooflens-k6-nav { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:7px; }
.prooflens-k6-nav a { padding:6px 9px; border:1px solid rgba(255,255,255,.28); border-radius:8px; color:#f5ffff !important; background:rgba(255,255,255,.1); font-size:10px; font-weight:750; text-decoration:none; white-space:nowrap; }
.prooflens-k6-nav a:hover,.prooflens-k6-nav a:focus-visible { background:rgba(255,255,255,.24); outline:2px solid #fff; outline-offset:2px; }
.prooflens-k6-theme { display:flex; align-items:center; gap:6px; color:#d8eef0; font-size:9px; font-weight:750; text-transform:uppercase; letter-spacing:.07em; }
.prooflens-k6-theme select { max-width:150px; padding:6px 8px; color:#fff; background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.4); border-radius:7px; font-family:inherit; font-size:10px; font-weight:650; }
.prooflens-k6-theme option { color:#172b3a; background:#fff; }
.prooflens-k6-owner { grid-template-columns:auto auto; align-items:center; column-gap:10px; }
body:has(.prooflens-k6-header) { background:#071321 !important; color:#e6eefc !important; }
.prooflens-k6-header + main .eyebrow { color:var(--prooflens-brand); }
.prooflens-k6-header + main .section-head a,.prooflens-k6-header + main .button-link { background:var(--prooflens-brand); }
.prooflens-k6-header + main .family-track i,.prooflens-k6-header + main .latency-track i { background:var(--prooflens-brand) !important; }
.prooflens-k6-header + main .family-track i { opacity:.86; }
.prooflens-k6-header + main .kpi,.prooflens-k6-header + main .panel { border-color:#2a4262 !important; background:#12233b !important; color:#e6eefc !important; }
.prooflens-k6-header + main .kpi small,.prooflens-k6-header + main .kpi p,.prooflens-k6-header + main .sub { color:#a8bad2 !important; }
.prooflens-k6-header + main .family,.prooflens-k6-header + main .detail-grid article { background:#0e1e33 !important; color:#e6eefc !important; border-color:#2a4262 !important; }
.prooflens-k6-header + main .family small,.prooflens-k6-header + main .detail-grid p { color:#a8bad2 !important; }
.prooflens-k6-header + main th { background:#0c1b2d !important; color:#b8c8dc !important; }
.prooflens-k6-header + main td { border-color:#293e5a !important; }
.prooflens-k6-header + main .detail-row td { background:#0d1a2b !important; }
.prooflens-k6-header + main .empty { background:#0c1a2b !important; color:#a8bad2 !important; border-color:#405776 !important; }
.prooflens-k6-header + main .latency-row { border-color:#293e5a !important; }
.prooflens-k6-header + main input,.prooflens-k6-header + main select { background:#0d1b2d !important; color:#e6eefc !important; border-color:#405777 !important; }
.prooflens-k6-header + main .k6-feature-link:hover { border-color:var(--prooflens-brand); }
.k6-feature-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:9px; }
.k6-feature-link { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 13px; border:1px solid #dfe8ee; border-radius:10px; background:#fff; color:#172b3a !important; text-decoration:none; }
.k6-feature-link:hover { border-color:#83c6c3; box-shadow:0 5px 14px rgba(23,43,58,.06); }
.k6-feature-link b { font-size:11px; }
.k6-feature-link span { color:#657b89; font-size:10px; white-space:nowrap; }
@media(max-width:850px){.prooflens-k6-header{grid-template-columns:1fr auto}.prooflens-k6-nav{grid-column:1/-1;justify-content:flex-start}.prooflens-k6-owner{border-left:0;padding-left:0}}
@media(max-width:560px){.prooflens-k6-header{grid-template-columns:1fr;gap:9px;padding:11px 15px}.prooflens-k6-owner{grid-template-columns:1fr;gap:7px}.prooflens-k6-theme{justify-content:space-between}.prooflens-k6-nav{grid-column:auto;justify-content:flex-start}.prooflens-k6-nav a{padding:6px 8px}main{margin-top:22px}}
</style>`;

function k6Header() {
  return `<header class="prooflens-k6-header"><a class="prooflens-k6-brand" href="k6-report.html"><img src="../public/prooflens-mark.svg" alt="ProofLens logo"><span class="prooflens-k6-brand-copy"><b>ProofLens AI</b><small>K6 Performance QA</small></span></a><div class="prooflens-k6-owner"><span><b>Raja Haroon Jamal</b><small>Full Stack QA Engineer · Department: QA</small></span><label class="prooflens-k6-theme" for="prooflens-report-theme">Theme<select id="prooflens-report-theme" aria-label="Choose shared report theme"><option value="prooflens">ProofLens teal</option><option value="dark-grey">Dark grey</option><option value="green">Green</option><option value="red">Red</option><option value="blue">Blue</option><option value="high-contrast-blue">High contrast blue</option><option value="purple">Purple</option><option value="amber">Amber</option></select></label></div><nav class="prooflens-k6-nav" aria-label="K6 report navigation"><a href="k6-report.html">Overview</a><a href="k6-cases-report.html">Case details</a><a href="allure-report/index.html">Allure report</a></nav></header>`;
}

const themeScript = `<script id="prooflens-report-theme-script">(()=>{const select=document.getElementById('prooflens-report-theme');if(!select)return;const allowed=new Set([...select.options].map(o=>o.value)),key='prooflens-report-theme';function apply(value){const theme=allowed.has(value)?value:'prooflens';document.documentElement.dataset.prooflensTheme=theme;select.value=theme}try{apply(localStorage.getItem(key)||localStorage.getItem('prooflens-allure-header-theme')||'prooflens')}catch{apply('prooflens')}select.addEventListener('change',()=>{apply(select.value);try{localStorage.setItem(key,select.value)}catch{}});window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue)})})();</script>`;

for (const path of files) {
  const fullPath = resolve(path);
  let html = await readFile(fullPath, 'utf8').catch(() => null);
  if (!html || !html.includes('</head>')) continue;
  html = html.replace(/<style id="prooflens-ai-report-branding">[\s\S]*?<\/style>/, '');
  html = html.replace(/<script id="prooflens-report-theme-script">[\s\S]*?<\/script>/, '');
  if (path === 'reports/k6-report.html' || path === 'reports/k6-cases-report.html') {
    html = html.replace(/<header\b[\s\S]*?<\/header>/, k6Header());
  }
  html = html.replace('</head>', `${style}</head>`);
  if (path === 'reports/k6-report.html' || path === 'reports/k6-cases-report.html') html = html.replace('</body>', `${themeScript}</body>`);
  await writeFile(fullPath, html);
}
console.log('ProofLens AI colors applied to generated QA report pages.');
