#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, InvalidArgumentError } from 'commander';

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
    (val, acc): Record<string, string> => {
      const eq = val.indexOf('=');
      if (eq === -1)
        throw new InvalidArgumentError(`expected key=value, got "${val}"`);
      acc[val.slice(0, eq)] = val.slice(eq + 1);
      return acc;
    },
    {} as Record<string, string>,
  )
  .parse();

const plugin = await resolvePlugin();
const configPath = generateMinimalPayloadConfig(plugin);
try {
  generateTypes(configPath);
} finally {
  cleanup(configPath);
}

async function resolvePlugin(): Promise<{ exportName: string; call: string }> {
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

function deriveExportName(): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'),
  );
  const name: string = pkg.name.replace(/^payload-/, '');
  return `${name}-plugin`.replace(/-([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  );
}

function generateMinimalPayloadConfig(plugin: {
  exportName: string;
  call: string;
}): string {
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
    defaultIDType: 'number',
    init: () => {
      throw new Error('Not implemented');
    },
  },
  collections: [{ slug: 'users', auth: true, fields: [] }],
  plugins: [${plugin.call}],
});
`,
  );
  return configPath;
}

function generateTypes(configPath: string): void {
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

function cleanup(configPath: string): void {
  fs.rmSync(configPath);
}
