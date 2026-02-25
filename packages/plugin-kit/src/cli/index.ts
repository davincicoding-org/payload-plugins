#!/usr/bin/env node

if (!process.env.__PLUGIN_KIT_TSX) {
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const { createRequire } = await import('node:module');

  const require = createRequire(import.meta.url);
  const tsxPath = pathToFileURL(require.resolve('tsx')).href;

  process.env.__PLUGIN_KIT_TSX = '1';
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
    process.exit((e as { status?: number }).status ?? 1);
  }
  process.exit(0);
}

const { program } = await import('@commander-js/extra-typings');
const { buildCommand } = await import('./build');
const { generateSchemasCommand } = await import('./generate-schemas');
const { generateTypesCommand } = await import('./generate-types');

program
  .addCommand(buildCommand)
  .addCommand(generateTypesCommand)
  .addCommand(generateSchemasCommand)
  .parse();
