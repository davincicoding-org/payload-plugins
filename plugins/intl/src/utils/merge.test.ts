import { describe, expect, test } from 'vitest';
import { mergeMessages } from './merge';

describe('mergeMessages', () => {
  test('fills leaves missing in target from source', () => {
    expect(
      mergeMessages(
        { common: { greeting: 'Hallo' } },
        { common: { greeting: 'Hello', items: 'items' } },
      ),
    ).toEqual({ common: { greeting: 'Hallo', items: 'items' } });
  });

  test('target string wins over source', () => {
    expect(mergeMessages({ a: 'de' }, { a: 'en' })).toEqual({ a: 'de' });
  });

  test('adds groups present only in source', () => {
    expect(mergeMessages({ a: 'de' }, { b: { c: 'en' } })).toEqual({
      a: 'de',
      b: { c: 'en' },
    });
  });

  test('merges nested groups recursively', () => {
    expect(
      mergeMessages(
        { nav: { home: 'Start' } },
        { nav: { home: 'Home', about: 'About' } },
      ),
    ).toEqual({ nav: { home: 'Start', about: 'About' } });
  });

  test('empty source is a no-op', () => {
    expect(mergeMessages({ a: 'de' }, {})).toEqual({ a: 'de' });
  });

  test('does not mutate the inputs', () => {
    const target = { a: 'de' };
    const source = { b: 'en' };
    mergeMessages(target, source);
    expect(target).toEqual({ a: 'de' });
    expect(source).toEqual({ b: 'en' });
  });
});
