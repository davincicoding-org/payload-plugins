#!/usr/bin/env node
// @ts-check

// tsx v4 requires --import flag. If not already loaded with tsx,
// respawn this script with the proper flag.
if (!process.env.__GEN_TYPES_TSX) {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const { createRequire } = await import('node:module');

  const require = createRequire(import.meta.url);
  const tsxPath = pathToFileURL(require.resolve('tsx')).href;

  process.env.__GEN_TYPES_TSX = '1';
  try {
    execFileSync(
      process.execPath,
      [
        '--import',
        tsxPath,
        fileURLToPath(import.meta.url),
        ...process.argv.slice(2),
      ],
      { stdio: 'inherit' },
    );
  } catch (e) {
    process.exit(/** @type {any} */ (e).status ?? 1);
  }
  process.exit(0);
}

// Note: execSync is used here with a hardcoded npx payload command
// and no user-controlled input, so shell injection is not a concern.
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, InvalidArgumentError } from '@commander-js/extra-typings';

const cwd = process.cwd();

const program = new Command()
  .name('generate-types')
  .description('Generate Payload types for a plugin')
  .option(
    '-e, --export <name>',
    'plugin export name (default: derived from package name)',
  )
  .option(
    '-o, --opt <key=value>',
    'plugin option (repeatable)',
    (val, acc) => {
      const eq = val.indexOf('=');
      if (eq === -1)
        throw new InvalidArgumentError(`expected key=value, got "${val}"`);
      acc[val.slice(0, eq)] = val.slice(eq + 1);
      return acc;
    },
    /** @type {Record<string, string>} */ ({}),
  )
  .parse();

const plugin = await resolvePlugin();
const configPath = generateMinimalPayloadConfig(plugin);
try {
  generateTypes(configPath);
} finally {
  cleanup(configPath);
}

/** @returns {Promise<{ exportName: string; call: string }>} */
async function resolvePlugin() {
  const opts = program.opts();
  const explicit = opts.export != null;
  const exportName = opts.export ?? deriveExportName();

  const mod = await import(path.join(cwd, 'src/index.ts'));
  if (typeof mod[exportName] !== 'function') {
    const fns = Object.entries(mod)
      .filter(([, v]) => typeof v === 'function')
      .map(([name]) => name);

    if (explicit) {
      console.error(
        `"${exportName}" is not a function export in src/index.ts.`,
      );
    } else {
      console.error(
        `Could not find a plugin export matching the naming convention "${exportName}").`,
      );
    }
    if (fns.length > 0) {
      console.error(`Available function exports: ${fns.join(', ')}`);
      console.error(`Fix: generate-types -e ${fns[0]}`);
    }
    process.exit(1);
  }

  return {
    exportName,
    call: `${exportName}(${JSON.stringify(opts.opt)} as any)`,
  };
}

/** @returns {string} */
function deriveExportName() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'),
  );
  /** @type {string} */
  const name = pkg.name.replace(/^payload-/, '');
  return `${name}-plugin`.replace(/-([a-z])/g, (_, /** @type {string} */ c) =>
    c.toUpperCase(),
  );
}

/**
 * @param {{ exportName: string; call: string }} plugin
 * @returns {string}
 */
function generateMinimalPayloadConfig(plugin) {
  const importPath = path.join(cwd, 'src/index').replaceAll('\\', '/');
  const configPath = path.join(cwd, '.payload-gen.config.ts');

  fs.writeFileSync(
    configPath,
    `
import { buildConfig } from 'payload';
import { ${plugin.exportName} } from '${importPath}';

export default buildConfig({
  secret: '',
  db: {
    defaultIDType: 'text',
    init: () => {
      throw new Error('Not implemented');
    },
  },
  email: ({ payload }) => ({
    defaultFromAddress: '',
    defaultFromName: '',
    name: '',
    sendEmail: async () => void 0,
  }),
  admin: {
    user: 'users',
  },
  collections: [
    { slug: 'users', auth: true, fields: [] },
    { slug: 'uploads', upload: true, fields: [] },
  ],
  plugins: [${plugin.call}],
});
`,
  );
  return configPath;
}

/** @param {string} configPath */
function generateTypes(configPath) {
  execSync('npx payload generate:types', {
    stdio: 'inherit',
    cwd,
    env: {
      ...process.env,
      PAYLOAD_CONFIG_PATH: configPath,
      PAYLOAD_TS_OUTPUT_PATH: path.join(cwd, 'src/payload-types.ts'),
    },
  });
}

/** @param {string} configPath */
function cleanup(configPath) {
  fs.rmSync(configPath);
}
