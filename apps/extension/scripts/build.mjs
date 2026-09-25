import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(extensionRoot, 'dist');
const sourceManifest = JSON.parse(await readFile(path.join(extensionRoot, 'manifest.json'), 'utf8'));
const files = [
  'background.js',
  'shared.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'options.html',
  'options.js',
  'options.css'
];

await rm(distRoot, { recursive: true, force: true });

for (const browser of ['chrome', 'firefox']) {
  const output = path.join(distRoot, browser);
  await mkdir(output, { recursive: true });
  await Promise.all(files.map(file => cp(path.join(extensionRoot, file), path.join(output, file))));

  const manifest = structuredClone(sourceManifest);
  if (browser === 'firefox') {
    delete manifest.minimum_chrome_version;
    manifest.background = { scripts: ['background.js'] };
    manifest.browser_specific_settings = {
      gecko: {
        id: 'prooflens-ai@prooflens.local',
        strict_min_version: '140.0',
        data_collection_permissions: {
          required: ['websiteActivity', 'websiteContent', 'personalCommunications']
        }
      }
    };
  }
  await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Built Chrome/Edge and Firefox extensions in ${path.relative(process.cwd(), distRoot)}`);
