import { describe, expect, it } from 'vitest';
import type { ScopeConfig } from '@/types';
import { normalizeScopes } from './scopes';

describe('normalizeScopes', () => {
  it('should return empty map for undefined', () => {
    expect(normalizeScopes(undefined)).toEqual(new Map());
  });

  it('should normalize string array to tab defaults', () => {
    const result = normalizeScopes(['header', 'footer']);
    expect(result).toEqual(
      new Map<string, ScopeConfig>([
        ['header', { position: 'tab' }],
        ['footer', { position: 'tab' }],
      ]),
    );
  });

  it('should normalize string shorthand in record', () => {
    const result = normalizeScopes({ header: 'sidebar', footer: 'tab' });
    expect(result).toEqual(
      new Map<string, ScopeConfig>([
        ['header', { position: 'sidebar' }],
        ['footer', { position: 'tab' }],
      ]),
    );
  });

  it('should pass through full config object', () => {
    const result = normalizeScopes({
      header: { position: 'tab', existingFieldsTabLabel: 'Header Fields' },
    });
    expect(result).toEqual(
      new Map<string, ScopeConfig>([
        [
          'header',
          { position: 'tab', existingFieldsTabLabel: 'Header Fields' },
        ],
      ]),
    );
  });
});
