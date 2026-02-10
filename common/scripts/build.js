#!/usr/bin/env node
// @ts-check
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { build, loadConfigFromFile, mergeConfig } from 'vite';
import { configureBuild } from '../vite.config.js';

const program = new Command()
  .name('plugin-build')
  .description('Build a Payload plugin using Vite')
  .option('-w, --watch', 'run in watch mode')
  .parse();

const opts = program.opts();
const cwd = process.cwd();

let config = configureBuild();

const localConfigPath = path.join(cwd, 'vite.config.ts');
if (fs.existsSync(localConfigPath)) {
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    localConfigPath,
  );
  if (loaded) {
    config = mergeConfig(config, loaded.config);
  }
}

if (opts.watch) {
  config.build = { ...config.build, watch: {} };
}

await build(config);
