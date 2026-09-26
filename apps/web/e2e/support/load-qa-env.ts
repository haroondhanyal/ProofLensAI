import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Loads QA-only, non-secret defaults. Existing process variables always win. */
export function loadQaEnv() {
  const envFile = resolve(process.cwd(), '.env.qa');
  const exampleFile = resolve(process.cwd(), '.env.qa.example');
  const file = existsSync(envFile) ? envFile : exampleFile;
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#') && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
    }
  }
}
