import { TYPE } from '@formatjs/icu-messageformat-parser';
import { describe, expect, test } from 'vitest';
import type { TemplateVariable } from '@/types';

import { createValidator, validateMessage } from './validate';

const argVar = (value: string): TemplateVariable =>
  ({ type: TYPE.argument, value }) as TemplateVariable;

const numVar = (value: string): TemplateVariable =>
  ({ type: TYPE.number, value }) as TemplateVariable;

const selectVar = (
  value: string,
  options: Record<string, { value: [] }>,
): TemplateVariable =>
  ({ type: TYPE.select, value, options }) as unknown as TemplateVariable;

describe('validateMessage', () => {
  test('valid message returns true', () => {
    const result = validateMessage('Hello {name}', [argVar('name')]);
    expect(result).toBe(true);
  });

  test('rejects non-string value', () => {
    const result = validateMessage(42, [argVar('name')]);
    expect(result).toBe('Invalid value');
  });

  test('rejects unsupported variable', () => {
    const result = validateMessage('Hello {name} {extra}', [argVar('name')]);
    expect(result).toBe('{extra} is not supported');
  });

  test('catches type mismatch (numeric vs argument)', () => {
    const result = validateMessage('{count}', [numVar('count')]);
    expect(result).toBe('{count} has invalid type');
  });

  test('validates select with missing option', () => {
    const schema = selectVar('gender', {
      male: { value: [] },
      female: { value: [] },
      other: { value: [] },
    });
    // Message has only male and other, missing female
    const result = validateMessage('{gender, select, male {He} other {They}}', [
      schema,
    ]);
    expect(result).toBe('{gender} has missing option: female');
  });

  test('validates select with extra option', () => {
    const schema = selectVar('gender', {
      male: { value: [] },
      other: { value: [] },
    });
    const result = validateMessage(
      '{gender, select, male {He} female {She} other {They}}',
      [schema],
    );
    expect(result).toBe('{gender} has unsupported option: female');
  });

  test('validates plural elements type', () => {
    const pluralVar = {
      type: TYPE.plural,
      value: 'count',
      options: { one: { value: [] }, other: { value: [] } },
      offset: 0,
      pluralType: 'cardinal',
    } as unknown as TemplateVariable;

    const result = validateMessage(
      '{count, plural, one {# item} other {# items}}',
      [pluralVar],
    );
    expect(result).toBe(true);
  });

  test('returns syntax error for invalid ICU', () => {
    const result = validateMessage('{unclosed', []);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/Invalid syntax/);
  });
});

describe('createValidator', () => {
  test('returns curried validator function', () => {
    const validate = createValidator([argVar('name')]);
    expect(typeof validate).toBe('function');
    expect(validate('Hello {name}')).toBe(true);
    expect(validate('{unknown}')).toBe('{unknown} is not supported');
  });
});
