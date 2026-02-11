import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { TYPE } from '@formatjs/icu-messageformat-parser';
import { describe, expect, test } from 'vitest';

import { isNumericElement, isTemporalElement } from './guards';

describe('isNumericElement', () => {
  test('returns true for number type', () => {
    const element = {
      type: TYPE.number,
      value: 'price',
    } as MessageFormatElement;
    expect(isNumericElement(element)).toBe(true);
  });

  test('returns true for plural type', () => {
    const element = {
      type: TYPE.plural,
      value: 'count',
      options: {},
      offset: 0,
      pluralType: 'cardinal',
    } as unknown as MessageFormatElement;
    expect(isNumericElement(element)).toBe(true);
  });

  test('returns false for argument type', () => {
    const element = {
      type: TYPE.argument,
      value: 'name',
    } as MessageFormatElement;
    expect(isNumericElement(element)).toBe(false);
  });

  test('returns false for date type', () => {
    const element = { type: TYPE.date, value: 'day' } as MessageFormatElement;
    expect(isNumericElement(element)).toBe(false);
  });
});

describe('isTemporalElement', () => {
  test('returns true for date type', () => {
    const element = { type: TYPE.date, value: 'day' } as MessageFormatElement;
    expect(isTemporalElement(element)).toBe(true);
  });

  test('returns true for time type', () => {
    const element = { type: TYPE.time, value: 'hour' } as MessageFormatElement;
    expect(isTemporalElement(element)).toBe(true);
  });

  test('returns false for argument type', () => {
    const element = {
      type: TYPE.argument,
      value: 'name',
    } as MessageFormatElement;
    expect(isTemporalElement(element)).toBe(false);
  });

  test('returns false for number type', () => {
    const element = {
      type: TYPE.number,
      value: 'price',
    } as MessageFormatElement;
    expect(isTemporalElement(element)).toBe(false);
  });
});
