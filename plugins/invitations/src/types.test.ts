import { describe, expect, test } from 'vitest';

import { acceptInviteSchema, reinviteSchema } from './types';

describe('reinviteSchema', () => {
  test('validates string userId', () => {
    const result = reinviteSchema.safeParse({ userId: 'user-1' });
    expect(result.success).toBe(true);
  });

  test('validates number userId', () => {
    const result = reinviteSchema.safeParse({ userId: 42 });
    expect(result.success).toBe(true);
  });

  test('rejects missing userId', () => {
    const result = reinviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('rejects boolean userId', () => {
    const result = reinviteSchema.safeParse({ userId: true });
    expect(result.success).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  test('validates valid input', () => {
    const result = acceptInviteSchema.safeParse({
      token: 'abc-123',
      password: 'securePassword!',
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing token', () => {
    const result = acceptInviteSchema.safeParse({
      password: 'securePassword!',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing password', () => {
    const result = acceptInviteSchema.safeParse({
      token: 'abc-123',
    });
    expect(result.success).toBe(false);
  });
});
