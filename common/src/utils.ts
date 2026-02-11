import type { Field } from 'payload';

export const uncaughtSwitchCase = (value: never) => {
  throw new Error(`Unhandled switch case: ${value}`);
};

export function findFields<T extends Field>(
  fields: Field[],
  condition: (field: Field) => field is T,
): T[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
): Field[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
): Field[] {
  return fields.flatMap((field) => {
    if (condition(field)) {
      return [field];
    }

    if ('fields' in field) {
      return findFields(field.fields, condition);
    }

    switch (field.type) {
      case 'blocks':
        return field.blocks.flatMap((block) =>
          findFields(block.fields, condition),
        );
      case 'tabs':
        return field.tabs.flatMap((tab) => findFields(tab.fields, condition));
      case 'text':
      case 'richText':
      case 'number':
      case 'checkbox':
      case 'date':
      case 'email':
      case 'select':
      case 'json':
      case 'code':
      case 'join':
      case 'point':
      case 'radio':
      case 'textarea':
      case 'ui':
      case 'relationship':
      case 'upload':
        return [];
      default:
        return uncaughtSwitchCase(field);
    }
  });
}
