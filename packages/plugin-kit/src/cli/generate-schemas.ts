import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from '@commander-js/extra-typings';
import { generate } from 'ts-to-zod';

export const generateSchemasCommand = new Command()
  .name('generate-schemas')
  .description('Generate Zod schemas from Payload types')
  .argument('<types...>', 'interface names to include')
  .action(async (types) => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const typesPath = path.resolve(srcDir, 'payload-types.ts');
    const include = new Set(types);

    const sourceText = fs.readFileSync(typesPath, 'utf-8');
    const { getZodSchemasFile, errors } = generate({
      sourceText,
      nameFilter: (name) => include.has(name),
    });

    if (errors.length) {
      console.error('ts-to-zod errors:', errors);
      process.exit(1);
    }

    const outputPath = path.resolve(srcDir, 'payload-schemas.ts');
    const importPath = `./${path.basename(typesPath, '.ts')}`;
    fs.writeFileSync(outputPath, getZodSchemasFile(importPath));
    console.log(`Generated: ${outputPath}`);
  });
