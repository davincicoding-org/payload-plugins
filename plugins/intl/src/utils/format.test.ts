import { TYPE } from '@formatjs/icu-messageformat-parser';
import { describe, expect, test } from 'vitest';
import type { TemplateVariable } from '@/types';

import { formatVariableLabel, toWords } from './format';

describe('toWords', () => {
  test('capitalizes first letter', () => {
    expect(toWords('hello')).toBe('Hello');
  });

  test('splits camelCase', () => {
    expect(toWords('helloWorld')).toBe('Hello World');
  });

  test('splits hyphens', () => {
    expect(toWords('hello-world')).toBe('Hello World');
  });

  test('joins when flag is true', () => {
    expect(toWords('hello world', true)).toBe('HelloWorld');
  });

  test('handles empty string', () => {
    expect(toWords('')).toBe('');
  });

  test('handles multiple camelCase words', () => {
    expect(toWords('myVariableName')).toBe('My Variable Name');
  });
});

describe('formatVariableLabel', () => {
  test('wraps tags in </>', () => {
    const tag = { type: TYPE.tag, value: 'bold' } as TemplateVariable;
    expect(formatVariableLabel(tag)).toBe('<bold/>');
  });

  test('returns value for non-tag elements', () => {
    const arg = { type: TYPE.argument, value: 'name' } as TemplateVariable;
    expect(formatVariableLabel(arg)).toBe('name');
  });

  test('returns value for number elements', () => {
    const num = { type: TYPE.number, value: 'count' } as TemplateVariable;
    expect(formatVariableLabel(num)).toBe('count');
  });
});
