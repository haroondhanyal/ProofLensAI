import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const reports = resolve(process.cwd(), 'reports');
const resultsDir = resolve(reports, 'allure-results');
await mkdir(resultsDir, { recursive: true });
const summary = JSON.parse(await readFile(resolve(reports, 'k6-summary.json'), 'utf8'));
const cases = summary.caseResults || [];
if (cases.length !== 150) throw new Error(`Expected 150 k6 cases, got ${cases.length}`);

for (const item of cases) {
  const now = Date.now();
  const uuid = randomUUID();
  const detailSource = `k6-case-${item.id}.json`;
  const status = item.status === 'PASS' ? 'passed' : item.status === 'FAIL' ? 'failed' : 'skipped';
  const observed = item.observedStatus?.min == null
    ? item.status === 'PASS' && Number(item.attempts) > 0 && Number(item.passRate) === 1 ? `${item.expected} (assertion matched)` : null
    : item.observedStatus.min === item.observedStatus.max ? String(item.observedStatus.min) : `${item.observedStatus.min}–${item.observedStatus.max}`;
  const detail = {
    caseId: item.id,
    feature: item.family,
    request: { method: item.method, path: item.path },
    expectedHttpStatus: item.expected,
    observedHttpStatus: observed,
    attempts: item.attempts,
    checkPassRate: item.passRate,
    result: item.status,
    latencyMs: item.latencyMs || null,
    responseChars: item.responseChars || null,
    evidenceNote: item.latencyMs?.avg == null ? 'This saved run did not include per-case latency or response-character metrics; a passing HTTP assertion confirms the expected status.' : 'Response bodies are intentionally excluded from the report.',
  };
  await writeFile(resolve(resultsDir, detailSource), JSON.stringify(detail, null, 2));
  const duration = Math.round(Number(item.latencyMs?.avg || 0) * Number(item.attempts || 0));
  const start = now - duration;
  const result = {
    uuid,
    historyId: item.id,
    testCaseId: item.id,
    name: `ProofLens AI · ${item.id} · ${item.family} · ${item.method} ${item.path}`,
    fullName: `ProofLens AI.k6 Performance.${item.id}`,
    status,
    stage: 'finished',
    start,
    stop: now,
    description: `Expected HTTP ${item.expected}; ${observed ? `observed HTTP ${observed}` : 'observed HTTP status was not recorded for this saved run'}; ${item.attempts} request attempt(s); ${Number(item.passRate || 0) * 100}% assertion pass rate. Data family: ${item.family}.`,
    labels: [
      { name: 'epic', value: 'ProofLens AI' },
      { name: 'feature', value: 'k6 performance' },
      { name: 'suite', value: `k6 · ${item.family}` },
      { name: 'tag', value: 'k6' },
      { name: 'environment', value: process.env.TEST_ENV || 'qa' },
    ],
    links: [],
    parameters: [{ name: 'runs', value: String(item.attempts) }, { name: 'expected status', value: String(item.expected) }],
    attachments: [{ name: `${item.id} · detailed K6 result`, source: detailSource, type: 'application/json' }],
    statusDetails: status === 'failed' ? { message: `This k6 case did not meet its expected HTTP ${item.expected} assertion or was never sampled${observed ? `; observed ${observed}` : ''}.` } : {},
    steps: [{ name: `${item.method} ${item.path} · expected HTTP ${item.expected}`, status, start, stop: now, parameters: [{ name: 'Feature', value: item.family }, { name: 'Observed HTTP status', value: observed || 'Not recorded in this saved run' }, { name: 'Attempts', value: String(item.attempts) }, { name: 'Assertion pass rate', value: `${Number(item.passRate || 0) * 100}%` }], attachments: [{ name: `${item.id} · request and performance evidence`, source: detailSource, type: 'application/json' }], steps: [] }],
  };
  await writeFile(resolve(resultsDir, `${uuid}-result.json`), JSON.stringify(result));
}
console.log(`Imported ${cases.length} k6 cases into Allure results.`);
