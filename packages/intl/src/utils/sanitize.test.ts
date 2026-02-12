import { describe, expect, test } from 'vitest';

import { sanitizeMessages } from './sanitize';

describe('sanitizeMessages', () => {
  test('keeps matching keys from config', () => {
    const config = { greeting: 'Hello {name}', farewell: 'Bye' };
    const data = { greeting: 'Hola {name}', farewell: 'Adiós' };
    const result = sanitizeMessages(config, data);
    expect(result).toEqual({ greeting: 'Hola {name}', farewell: 'Adiós' });
  });

  test('omits extra keys not in config', () => {
    const config = { greeting: 'Hello' };
    const data = { greeting: 'Hola', extra: 'nope' };
    const result = sanitizeMessages(config, data);
    expect(result).toEqual({ greeting: 'Hola' });
    expect(result).not.toHaveProperty('extra');
  });

  test('omits non-string leaves', () => {
    const config = { title: 'Title', count: 'Count' };
    const data = { title: 'Título', count: 42 };
    const result = sanitizeMessages(config, data);
    expect(result).toEqual({ title: 'Título' });
  });

  test('omits empty groups after sanitization', () => {
    const config = { group: { msg: 'Hello' } };
    const data = { group: { msg: 123 } };
    const result = sanitizeMessages(config, data);
    expect(result).toEqual({});
  });

  test('handles nested structures', () => {
    const config = {
      header: { title: 'Title', subtitle: 'Subtitle' },
      footer: 'Footer',
    };
    const data = {
      header: { title: 'Título', subtitle: 'Subtítulo' },
      footer: 'Pie',
    };
    const result = sanitizeMessages(config, data);
    expect(result).toEqual({
      header: { title: 'Título', subtitle: 'Subtítulo' },
      footer: 'Pie',
    });
  });

  test('handles non-object data gracefully', () => {
    const config = { greeting: 'Hello' };
    const result = sanitizeMessages(config, null);
    expect(result).toEqual({});
  });

  test('handles array data gracefully', () => {
    const config = { greeting: 'Hello' };
    const result = sanitizeMessages(config, ['not', 'an', 'object']);
    expect(result).toEqual({});
  });

  test('falls back to schema values when useSchemaDefaults is true', () => {
    const config = { greeting: 'Hello', farewell: 'Bye' };
    const data = { greeting: 'Hi' };
    const result = sanitizeMessages(config, data, { useSchemaDefaults: true });
    expect(result).toEqual({ greeting: 'Hi', farewell: 'Bye' });
  });

  test('falls back to schema values for nested structures', () => {
    const config = { group: { title: 'Title', subtitle: 'Subtitle' } };
    const data = { group: { title: 'Custom' } };
    const result = sanitizeMessages(config, data, { useSchemaDefaults: true });
    expect(result).toEqual({
      group: { title: 'Custom', subtitle: 'Subtitle' },
    });
  });

  test('does not fall back to schema values when useSchemaDefaults is false', () => {
    const config = { greeting: 'Hello', farewell: 'Bye' };
    const data = { greeting: 'Hi' };
    const result = sanitizeMessages(config, data, { useSchemaDefaults: false });
    expect(result).toEqual({ greeting: 'Hi' });
  });

  test('fills all leaves from schema when data is empty and useSchemaDefaults is true', () => {
    const config = { greeting: 'Hello', group: { msg: 'World' } };
    const result = sanitizeMessages(config, null, { useSchemaDefaults: true });
    expect(result).toEqual({ greeting: 'Hello', group: { msg: 'World' } });
  });
});
