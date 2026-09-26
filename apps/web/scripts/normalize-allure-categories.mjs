import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const resultsDir = resolve(process.cwd(), 'reports/allure-results');
const testFiles = (await readdir(resultsDir)).filter(name => name.endsWith('-result.json'));
const byFile = [
  [/^(?:phase1|ui|ui-matrix|product-features)\.spec\.ts$/, 'UI Tests'],
  [/^(?:api|api-matrix|api-feature-flows)\.spec\.ts$/, 'API Tests'],
  [/^(?:.*\.feature|.*\.steps\.ts)$/, 'BDD Scenarios'],
  [/^system-integration\.spec\.ts$/, 'System + Integration'],
];

for (const file of testFiles) {
  const path = resolve(resultsDir, file);
  const result = JSON.parse(await readFile(path, 'utf8'));
  const labels = result.labels ?? (result.labels = []);
  const get = name => labels.find(label => label.name === name)?.value;
  const pkg = get('package') ?? '';
  const suite = get('suite') ?? '';
  const source = pkg.split('.').at(-3) === 'spec' ? pkg.split('.').slice(-3).join('.') : suite;
  const isK6 = get('tag') === 'k6' || get('feature')?.toLowerCase().includes('k6') || suite.startsWith('k6');
  const category = isK6 ? 'k6 Performance' : byFile.find(([pattern]) => pattern.test(source))?.[1]
    ?? (get('parentSuite') === 'bdd' || get('feature') ? 'BDD Scenarios' : undefined);
  if (!category) continue;

  for (const label of labels.filter(item => item.name === 'parentSuite')) label.value = category;
  if (!labels.some(item => item.name === 'parentSuite')) labels.push({ name: 'parentSuite', value: category });
  if (isK6) {
    for (const label of labels.filter(item => item.name === 'suite')) label.value = 'k6 cases';
  }
  await writeFile(path, JSON.stringify(result));
}
console.log(`Normalized Allure category suites for ${testFiles.length} test results.`);
