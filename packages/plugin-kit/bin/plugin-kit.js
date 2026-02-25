#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distCli = resolve(__dirname, '../dist/cli/index.js');
const srcCli = resolve(__dirname, '../src/cli/index.ts');

const target = existsSync(distCli) ? distCli : srcCli;

const require = createRequire(import.meta.url);
const tsxPath = pathToFileURL(require.resolve('tsx')).href;

try {
  execFileSync(
    process.execPath,
    ['--import', tsxPath, target, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, __PLUGIN_KIT_TSX: '1' } },
  );
} catch (e) {
  process.exit(e.status ?? 1);
}
