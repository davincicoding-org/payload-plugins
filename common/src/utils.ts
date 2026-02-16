import type { Field } from 'payload';

export const uncaughtSwitchCase = (value: never) => {
  throw new Error(`Unhandled switch case: ${value}`);
};

export type FieldWithPath<T extends Field> = T & {
  path: string[];
};

export function findFields<T extends Field>(
  fields: Field[],
  condition: (field: Field) => field is T,
  path?: string[],
): FieldWithPath<T>[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
  path?: string[],
): FieldWithPath<Field>[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
  path: string[] = [],
): FieldWithPath<Field>[] {
  return fields.flatMap((field) => {
    if (condition(field)) {
      return [
        { ...field, path: 'name' in field ? [...path, field.name] : path },
      ];
    }

    if ('fields' in field) {
      return findFields(
        field.fields,
        condition,
        'name' in field ? [...path, field.name] : path,
      );
    }

    switch (field.type) {
      case 'blocks':
        return field.blocks.flatMap((block) =>
          findFields(block.fields, condition, [...path, field.name]),
        );
      case 'tabs':
        return field.tabs.flatMap((tab) =>
          findFields(
            tab.fields,
            condition,
            'name' in tab ? [...path, tab.name] : path,
          ),
        );
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
