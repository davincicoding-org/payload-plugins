#!/usr/bin/env node
// @ts-check
import { execSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  watch,
  writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from '@commander-js/extra-typings';

const program = new Command()
  .name('plugin-build')
  .description('Build a Payload plugin using SWC + tsc')
  .option('-w, --watch', 'run in watch mode')
  .parse();

const opts = program.opts();
const cwd = process.cwd();
const commonDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const swcrc = path.join(commonDir, '.swcrc');

// Local bin first (package's own tsc), then common bin (swc, tsc-alias)
const localBin = path.join(cwd, 'node_modules', '.bin');
const commonBin = path.join(commonDir, 'node_modules', '.bin');
process.env.PATH = [localBin, commonBin, process.env.PATH].join(path.delimiter);

const ASSET_RE = /\.(css|scss|html|json|ttf|woff|woff2|eot|svg|jpg|png)$/;
const SWC_IGNORE =
  '**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,**/payload-types.ts';
// tsconfig is resolved lazily via resolveBuildTsConfig() below

// Note: execSync is used here with hardcoded build tool commands (swc, tsc, tsc-alias)
// and no user-controlled input, so shell injection is not a concern.
/** @param {string} cmd @param {import('node:child_process').ExecSyncOptions} [o] */
const exec = (cmd, o) => execSync(cmd, { cwd, stdio: 'inherit', ...o });

/**
 * Remove the `declare module 'payload'` augmentation from the built
 * payload-types.d.ts so plugins don't pollute the consumer's type space.
 * The interfaces themselves (User, Notification, etc.) are kept so that
 * exported plugin types referencing them still resolve.
 */
function stripPayloadAugmentation() {
  const dts = path.join(cwd, 'dist', 'payload-types.d.ts');
  if (!existsSync(dts)) return;
  const content = readFileSync(dts, 'utf-8');
  const stripped = content.replace(
    /\n*declare module ['"]payload['"] \{[\s\S]*?\n\}\n/,
    '\n',
  );
  if (stripped !== content) writeFileSync(dts, stripped);
}

/**
 * Resolve the tsconfig used for declaration builds. If the project provides
 * its own `tsconfig.build.json` we use it as-is. Otherwise we generate a
 * temporary config that extends the base `tsconfig.json` while excluding
 * test files.
 */
function resolveBuildTsConfig() {
  if (existsSync(path.join(cwd, 'tsconfig.build.json'))) {
    return { tsconfig: 'tsconfig.build.json', cleanup: () => {} };
  }

  const tmpName = '.tsconfig.build.tmp.json';
  const tmpPath = path.join(cwd, tmpName);
  const tmpBuildInfo = path.join(cwd, '.tsconfig.build.tmp.tsbuildinfo');

  writeFileSync(
    tmpPath,
    // biome-ignore lint/style/useTemplate: this is more readable
    JSON.stringify(
      {
        extends: './tsconfig.json',
        exclude: [
          'node_modules',
          'dist',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/**/*.spec.ts',
          'src/**/*.spec.tsx',
        ],
      },
      null,
      2,
    ) + '\n',
  );

  const cleanup = () => {
    if (existsSync(tmpPath)) rmSync(tmpPath);
    if (existsSync(tmpBuildInfo)) rmSync(tmpBuildInfo);
  };

  return { tsconfig: tmpName, cleanup };
}

function copyAssets() {
  const srcDir = path.join(cwd, 'src');
  if (!existsSync(srcDir)) return;
  for (const entry of readdirSync(srcDir, { recursive: true })) {
    const file = String(entry);
    if (!ASSET_RE.test(file)) continue;
    const dest = path.join(cwd, 'dist', file);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(path.join(srcDir, file), dest);
  }
}

if (opts.watch) {
  const { tsconfig, cleanup: cleanupTsConfig } = resolveBuildTsConfig();

  /** @type {import('node:child_process').ChildProcess[]} */
  const children = [];
  const shutdown = () => {
    for (const c of children) c.kill();
    cleanupTsConfig();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);

  /** @param {string} cmd @param {string[]} args */
  const start = (cmd, args) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    child.on('error', (err) => {
      process.stderr.write(`[${cmd}] ${err.message}\n`);
      process.exit(1);
    });
    children.push(child);
  };

  copyAssets();

  const srcDir = path.join(cwd, 'src');
  watch(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename || !ASSET_RE.test(filename)) return;
    const src = path.join(srcDir, filename);
    if (!existsSync(src)) return;
    const dest = path.join(cwd, 'dist', filename);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  });

  start('swc', [
    'src',
    '-d',
    'dist',
    '--config-file',
    swcrc,
    '--strip-leading-paths',
    '--ignore',
    SWC_IGNORE,
    '--watch',
  ]);
  start('tsc', [
    '-p',
    tsconfig,
    '--emitDeclarationOnly',
    '--watch',
    '--preserveWatchOutput',
  ]);
  start('tsc-alias', ['-p', tsconfig, '--watch']);
} else {
  if (existsSync(path.join(cwd, 'dist')))
    rmSync(path.join(cwd, 'dist'), { recursive: true, force: true });
  for (const f of ['tsconfig.tsbuildinfo', 'tsconfig.build.tsbuildinfo']) {
    const p = path.join(cwd, f);
    if (existsSync(p)) rmSync(p);
  }

  const { tsconfig, cleanup } = resolveBuildTsConfig();
  try {
    copyAssets();
    exec(
      `swc src -d dist --config-file "${swcrc}" --strip-leading-paths --ignore "${SWC_IGNORE}"`,
    );
    exec(`tsc -p ${tsconfig} --emitDeclarationOnly`);
    exec(`tsc-alias -p ${tsconfig}`);
    stripPayloadAugmentation();
  } finally {
    cleanup();
  }
}
