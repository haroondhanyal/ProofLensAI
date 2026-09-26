import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const reports = resolve(process.cwd(), 'reports');
const resultsDir = resolve(reports, 'allure-results');
await mkdir(resultsDir, { recursive: true });
const summary = JSON.parse(await readFile(resolve(reports, 'k6-summary.json'), 'utf8'));
const cases = summary.caseResults || [];
if (cases.length !== 150) throw new Error(`Expected 150 k6 cases, got ${cases.length}`);
const summaryAttachment = 'k6-matrix-summary.json';
await copyFile(resolve(reports, 'k6-summary.json'), resolve(resultsDir, summaryAttachment));

for (const item of cases) {
  const now = Date.now();
  const uuid = randomUUID();
  const status = item.status === 'PASS' ? 'passed' : item.status === 'FAIL' ? 'failed' : 'skipped';
  const result = {
    uuid,
    historyId: item.id,
    testCaseId: item.id,
    name: `ProofLens AI · ${item.id} · ${item.family} · ${item.method} ${item.path}`,
    fullName: `ProofLens AI.k6 Performance.${item.id}`,
    status,
    stage: 'finished',
    start: now,
    stop: now,
    description: `Expected HTTP ${item.expected}; observed across ${item.attempts} request(s). Data family: ${item.family}.`,
    labels: [
      { name: 'epic', value: 'ProofLens AI' },
      { name: 'feature', value: 'k6 performance' },
      { name: 'suite', value: `k6 · ${item.family}` },
      { name: 'tag', value: 'k6' },
      { name: 'environment', value: process.env.TEST_ENV || 'qa' },
    ],
    links: [],
    parameters: [{ name: 'runs', value: String(item.attempts) }, { name: 'expected status', value: String(item.expected) }],
    attachments: [{ name: 'Full k6 run summary', source: summaryAttachment, type: 'application/json' }],
    statusDetails: status === 'failed' ? { message: 'This k6 case did not meet its expected response assertion or was never sampled.' } : {},
    steps: [],
  };
  await writeFile(resolve(resultsDir, `${uuid}-result.json`), JSON.stringify(result));
}
console.log(`Imported ${cases.length} k6 cases into Allure results.`);
