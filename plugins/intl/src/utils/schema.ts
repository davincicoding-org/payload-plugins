import type { JSONField } from 'payload';
import type { MessagesSchema } from '@/types';

type Schema = NonNullable<JSONField['jsonSchema']>['schema'];

export function messagesToJsonSchema(messages: MessagesSchema): Schema {
  const properties: Record<string, Schema | { type: 'string' }> = {};

  for (const [key, value] of Object.entries(messages)) {
    properties[key] =
      typeof value === 'string'
        ? { type: 'string' }
        : messagesToJsonSchema(value);
  }

  return {
    type: 'object',
    properties,
    required: Object.keys(messages),
  };
}
