import { program } from '@commander-js/extra-typings';
import { buildCommand } from './build';
import { generateSchemasCommand } from './generate-schemas';
import { generateTypesCommand } from './generate-types';

program
  .addCommand(buildCommand)
  .addCommand(generateTypesCommand)
  .addCommand(generateSchemasCommand)
  .parse();
