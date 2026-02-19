import { TYPE } from '@formatjs/icu-messageformat-parser';
import { describe, expect, test } from 'vitest';

import { parseMessageSchema } from './schema';

describe('schema', () => {
  describe('parseMessageSchema', () => {
    test('extracts simple argument variables', () => {
      const schema = 'Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: undefined,
        variables: [{ type: TYPE.argument, value: 'name' }],
      });
    });

    test('extracts description in brackets', () => {
      const schema = '[Some description] Hello {name}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        variables: [{ type: TYPE.argument, value: 'name' }],
      });
    });

    test('extracts all variables including optional ones', () => {
      const schema = '[Some description] Hello {name} | {_variable}';
      const metadata = parseMessageSchema(schema);
      expect(metadata).toEqual({
        description: 'Some description',
        variables: [
          { type: TYPE.argument, value: 'name' },
          { type: TYPE.argument, value: '_variable' },
        ],
      });
    });

    test('extracts plural variables', () => {
      const schema = '{count, plural, one {# item} other {# items}}';
      const metadata = parseMessageSchema(schema);
      expect(metadata.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: TYPE.plural, value: 'count' }),
        ]),
      );
    });

    test('extracts select variables', () => {
      const schema = '{gender, select, male {He} female {She} other {They}}';
      const metadata = parseMessageSchema(schema);
      expect(metadata.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: TYPE.select, value: 'gender' }),
        ]),
      );
    });

    test('extracts nested variables inside select options', () => {
      const schema =
        '{gender, select, male {Hello {name}} female {Hello {name}} other {Hello {name}}}';
      const metadata = parseMessageSchema(schema);
      const names = metadata.variables.filter((v) => v.value === 'name');
      expect(names.length).toBeGreaterThanOrEqual(1);
    });

    test('extracts tag elements', () => {
      const schema = '<bold>Hello</bold>';
      const metadata = parseMessageSchema(schema);
      expect(metadata.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: TYPE.tag, value: 'bold' }),
        ]),
      );
    });

    test('extracts number/date/time types', () => {
      const schema = '{price, number} on {day, date} at {hour, time}';
      const metadata = parseMessageSchema(schema);
      expect(metadata.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: TYPE.number, value: 'price' }),
          expect.objectContaining({ type: TYPE.date, value: 'day' }),
          expect.objectContaining({ type: TYPE.time, value: 'hour' }),
        ]),
      );
    });

    test('returns empty variables for plain text', () => {
      const schema = 'Just some text';
      const metadata = parseMessageSchema(schema);
      expect(metadata.variables).toEqual([]);
      expect(metadata.description).toBeUndefined();
    });

    test('handles description with different formats', () => {
      const schema = '[User greeting message]Hello';
      const metadata = parseMessageSchema(schema);
      expect(metadata.description).toBe('User greeting message');
    });
  });
});
