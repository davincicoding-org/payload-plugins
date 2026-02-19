import { describe, expect, test } from 'vitest';

import { getAuthentication } from './authentication';

function createMockReq({
  authorization,
  user,
}: {
  authorization?: string;
  user?: { id: string } | null;
}) {
  return {
    headers: new Headers(authorization ? { authorization } : undefined),
    user: user ?? null,
  } as any;
}

describe('getAuthentication', () => {
  const cronSecret = 'my-secret-token';

  test('returns "cron" for valid Bearer token', () => {
    const req = createMockReq({
      authorization: `Bearer ${cronSecret}`,
    });
    expect(getAuthentication(req, cronSecret)).toBe('cron');
  });

  test('returns "user" for authenticated user', () => {
    const req = createMockReq({ user: { id: 'user-1' } });
    expect(getAuthentication(req, cronSecret)).toBe('user');
  });

  test('returns null for no auth', () => {
    const req = createMockReq({});
    expect(getAuthentication(req, cronSecret)).toBeNull();
  });

  test('Bearer token must match exactly', () => {
    const req = createMockReq({
      authorization: 'Bearer wrong-token',
    });
    expect(getAuthentication(req, cronSecret)).toBeNull();
  });

  test('cron auth takes priority over user auth', () => {
    const req = createMockReq({
      authorization: `Bearer ${cronSecret}`,
      user: { id: 'user-1' },
    });
    expect(getAuthentication(req, cronSecret)).toBe('cron');
  });
});
