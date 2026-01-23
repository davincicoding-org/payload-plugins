import { describe, expect, test } from 'vitest';

import { parseMessageSchema } from './schema';

describe('schema', () => {
  describe('parseMessageSchema', () => {
    test('should extract example', () => {
      const schema = 'Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: undefined,
        example: 'Hello {name}',
      });
    });

    test('should extract description', () => {
      const schema = '[Some description] Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        example: 'Hello {name}',
      });
    });

    test('should ignore optional variables', () => {
      const schema = '[Some description] Hello {name} | {_variable}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        example: 'Hello {name}',
      });
    });
  });
});
