#!/usr/bin/env node
// @ts-check
import { execSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  watch,
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
const TEST_IGNORE = '**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx';
const tsconfig = existsSync(path.join(cwd, 'tsconfig.build.json'))
  ? 'tsconfig.build.json'
  : 'tsconfig.json';

// @repo/common inlining via symlink
const commonSrc = path.join(commonDir, 'src');
const symlinkPath = path.join(cwd, 'src', 'internals');

function ensureCommonSymlink() {
  try {
    lstatSync(symlinkPath);
    unlinkSync(symlinkPath);
  } catch {
    // symlink doesn't exist yet — fine
  }
  const target = path.relative(path.join(cwd, 'src'), commonSrc);
  symlinkSync(target, symlinkPath, 'dir');
}

function removeCommonSymlink() {
  try {
    unlinkSync(symlinkPath);
  } catch {
    // already removed — fine
  }
}

/** @param {string} cmd @param {import('node:child_process').ExecSyncOptions} [o] */
const exec = (cmd, o) => execSync(cmd, { cwd, stdio: 'inherit', ...o });

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
  /** @type {import('node:child_process').ChildProcess[]} */
  const children = [];
  const cleanup = () => {
    for (const c of children) c.kill();
    removeCommonSymlink();
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  /** @param {string} cmd @param {string[]} args */
  const start = (cmd, args) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    child.on('error', (err) => {
      process.stderr.write(`[${cmd}] ${err.message}\n`);
      process.exit(1);
    });
    children.push(child);
  };

  ensureCommonSymlink();
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
    TEST_IGNORE,
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

  ensureCommonSymlink();
  try {
    copyAssets();
    exec(
      `swc src -d dist --config-file "${swcrc}" --strip-leading-paths --ignore "${TEST_IGNORE}"`,
    );
    exec(`tsc -p ${tsconfig} --emitDeclarationOnly`);
    exec(`tsc-alias -p ${tsconfig}`);
  } finally {
    removeCommonSymlink();
  }
}
