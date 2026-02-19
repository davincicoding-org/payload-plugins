import { describe, expect, test } from 'vitest';

import { autoGeneratePassword } from './auto-generate-password';

describe('autoGeneratePassword', () => {
  test('generates 64-char hex password on create', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result).toBeDefined();
    expect(result?.password).toMatch(/^[0-9a-f]{64}$/);
    expect(result?.['confirm-password']).toBe(result?.password);
  });

  test('sets email from _email', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result?.email).toBe('test@example.com');
  });

  test('returns new object (immutability)', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result).not.toBe(data);
  });

  test('returns data unchanged for non-create operations', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'update',
      data,
    } as any);

    expect(result).toBe(data);
    expect(result).not.toHaveProperty('password');
  });
});
