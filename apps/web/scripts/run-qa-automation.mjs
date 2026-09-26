import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cwd = process.cwd();
const reports = resolve(cwd, 'reports');
const env = { ...process.env };
env.PATH = `${process.execPath.slice(0, process.execPath.lastIndexOf('/'))}:${env.PATH || ''}`;
delete env.JAVA_HOME;
const envFile = resolve(cwd, '.env.qa');
const exampleFile = resolve(cwd, '.env.qa.example');

const envContent = await readFile(envFile, 'utf8').catch(() => readFile(exampleFile, 'utf8'));
for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match && !match[1].startsWith('#') && env[match[1]] === undefined) env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
}

env.TEST_ENV ??= 'qa';
env.PLAYWRIGHT_BASE_URL ??= 'http://localhost:3001';
env.API_BASE_URL ??= 'http://localhost:8000/api/v1';
env.NEXT_PUBLIC_API_URL ??= env.API_BASE_URL;
env.PW_WORKERS ??= '2';
env.K6_VUS ??= '10';
env.K6_DURATION ??= '30s';

const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (!((nodeMajor === 22 && nodeMinor >= 13) || (nodeMajor === 24 && nodeMinor >= 3) || nodeMajor >= 25)) {
  throw new Error(`QA runner needs Node 22.13+, 24.3+, or 25+. Current Node: ${process.versions.node}. Run nvm use from the project root.`);
}

await mkdir(reports, { recursive: true });
for (const artifact of ['allure-results', 'allure-report', 'playwright-html', 'test-artifacts', '.last-run.json', 'test-results.json', 'cucumber-report.html', 'k6-summary.json', 'k6-timeseries.json', 'k6-report.html', 'k6-cases-report.html', 'suite-manifest.json']) {
  await rm(resolve(reports, artifact), { recursive: true, force: true });
}
await rm(resolve(cwd, '.bdd-generated'), { recursive: true, force: true });
const failures = [];

async function run(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  try {
    await new Promise((resolvePromise, reject) => {
      const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: false, ...options });
      child.once('error', reject);
      child.once('exit', (code, signal) => code === 0 ? resolvePromise() : reject(new Error(`${label} stopped (${signal || `exit ${code}`}).`)));
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(message);
    console.error(message);
    return false;
  }
}

try {
  const healthUrl = new URL('/health', env.API_BASE_URL);
  const health = await fetch(healthUrl, { signal: AbortSignal.timeout(4_000) }).catch(() => null);
  if (!health?.ok) throw new Error(`ProofLens API did not answer at ${healthUrl}. Start the API using the README instructions, then rerun npm run test:qa.`);
  await run('Generate 120 Gherkin cases', 'npx', ['bddgen', '--config', 'playwright.config.ts']);
  await run('Run 610 Playwright UI, API, BDD, and system/integration cases', 'npx', ['playwright', 'test']);
  await run('Run 150 k6 performance cases', 'docker', [
    'run', '--rm', '-e', `API_BASE_URL=${env.API_BASE_URL.replace(/^http:\/\/(localhost|127\.0\.0\.1)(?=:)/, 'http://host.docker.internal')}`, '-e', `K6_VUS=${env.K6_VUS}`, '-e', `K6_DURATION=${env.K6_DURATION}`,
    '-v', `${cwd}:/work`, '-w', '/work', 'grafana/k6:1.6.1', 'run', '--out', 'json=reports/k6-timeseries.json', 'performance/k6/prooflens-matrix.js',
  ]);
  const manifest = {
    project: 'ProofLens AI', environment: env.TEST_ENV, generatedAt: new Date().toISOString(),
    targets: { ui: 265, api: 125, bdd: 120, k6: 150, systemIntegration: 100, total: 760 },
    browser: 'Chromium', baseUrl: env.PLAYWRIGHT_BASE_URL, apiUrl: env.API_BASE_URL,
    loadProfile: { vus: Number(env.K6_VUS), duration: env.K6_DURATION },
    evidence: { screenshots: 'reports/test-artifacts', videos: 'reports/test-artifacts', allure: 'reports/allure-report/index.html' },
    data: 'Faker generated .example identities; API-created account and scan data is deleted by test teardown.',
  };
  await writeFile(resolve(reports, 'suite-manifest.json'), JSON.stringify(manifest, null, 2));
  if (await readFile(resolve(reports, 'k6-summary.json')).catch(() => null)) {
    await run('Import k6 cases into Allure', 'node', ['scripts/import-k6-allure.mjs']);
  }
  await run('Group Allure results into ProofLens test categories', 'node', ['scripts/normalize-allure-categories.mjs']);
  await run('Build the Allure report', 'npx', ['allure', 'generate', 'reports/allure-results', '--clean', '-o', 'reports/allure-report']);
  await run('Apply ProofLens AI Allure branding', 'node', ['scripts/brand-allure-report.mjs']);
  await run('Build ProofLens grouped reports', 'node', ['scripts/build-automation-reports.mjs']);
  if (await readFile(resolve(reports, 'k6-summary.json')).catch(() => null)) {
    await run('Build modern K6 overview and case detail reports', 'node', ['scripts/build-k6-report.mjs']);
    await run('Apply ProofLens AI report colors', 'node', ['scripts/brand-generated-reports.mjs']);
  } else {
    console.warn('K6 did not produce a summary in this run; skipping K6 report generation rather than showing saved historical results as current.');
  }
  await run('Build ProofLens category, retry, and duration trends', 'node', ['scripts/build-qa-dashboard.mjs']);
  if (failures.length) {
    console.error(`\nQA run completed with ${failures.length} failing stage(s). Reports include the results collected before failure.`);
    process.exitCode = 1;
  } else {
    console.log('\n760-case QA run completed. Open reports/index.html or reports/allure-report/index.html.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
