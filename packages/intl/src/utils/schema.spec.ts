import { describe, expect, test } from 'vitest';

import { parseMessageSchema } from './schema';

describe('schema', () => {
  describe('parseMessageSchema', () => {
    test('should extract variables', () => {
      const schema = 'Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: undefined,
        variables: [{ type: 1, value: 'name' }],
      });
    });

    test('should extract description', () => {
      const schema = '[Some description] Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        variables: [{ type: 1, value: 'name' }],
      });
    });

    test('should extract all variables including optional', () => {
      const schema = '[Some description] Hello {name} | {_variable}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        variables: [
          { type: 1, value: 'name' },
          { type: 1, value: '_variable' },
        ],
      });
    });
  });
});
