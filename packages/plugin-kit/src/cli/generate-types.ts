import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command, InvalidArgumentError } from '@commander-js/extra-typings';

export const generateTypesCommand = new Command()
  .name('generate-types')
  .description('Generate Payload types for a plugin')
  .option(
    '-e, --export <name>',
    'plugin export name (default: derived from package name)',
  )
  .option(
    '-o, --options <key=value>',
    'plugin option (repeatable)',
    (val, acc): Record<string, string> => {
      const [key, value] = val.split(/=(.*)/s);
      if (!key || !value) {
        throw new InvalidArgumentError(`expected key=value, got "${val}"`);
      }

      return {
        ...acc,
        [key]: value,
      };
    },
    /** @type {Record<string, string>} */ ({}),
  )
  .action(async ({ options: pluginOptions, export: exportName }) => {
    const plugin = await resolvePlugin({ exportName, pluginOptions });
    const configPath = generateMinimalPayloadConfig(plugin);

    try {
      generatePayloadTypes(configPath);
    } finally {
      fs.rmSync(configPath);
    }
  });

async function resolvePlugin(options: {
  exportName: string | undefined;
  pluginOptions: Record<string, string>;
}) {
  const exportName = options.exportName || deriveExportName();

  const mod = await import(path.join(process.cwd(), 'src/index.ts'));
  if (typeof mod[exportName] !== 'function') {
    if (options.exportName) {
      console.error(
        `"${options.exportName}" is not a function export in src/index.ts.`,
      );
    } else {
      console.error(
        `Could not find a plugin export matching the naming convention "${exportName}").`,
      );
    }

    const fns = Object.entries(mod)
      .filter(([, v]) => typeof v === 'function')
      .map(([name]) => name);

    if (fns.length > 0) {
      console.error(`Available function exports: ${fns.join(', ')}`);
      console.error(`Fix: generate-types -e ${fns[0]}`);
    }
    process.exit(1);
  }

  return {
    exportName,
    call: `${exportName}(${JSON.stringify(options.pluginOptions)} as any)`,
  };
}

function deriveExportName() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
  );
  const name = pkg.name.replace(/^payload-/, '');
  return `${name}-plugin`.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function generateMinimalPayloadConfig(plugin: {
  exportName: string;
  call: string;
}) {
  const importPath = path
    .join(process.cwd(), 'src/index')
    .replaceAll('\\', '/');
  const configPath = path.join(process.cwd(), '.payload-gen.config.ts');

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

function generatePayloadTypes(configPath: string) {
  execSync('npx payload generate:types', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      PAYLOAD_CONFIG_PATH: configPath,
      PAYLOAD_TS_OUTPUT_PATH: path.join(process.cwd(), 'src/payload-types.ts'),
    },
  });
}
