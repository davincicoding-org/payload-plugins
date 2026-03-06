import type { Payload } from 'payload';
import { describe, expect, test, vi } from 'vitest';

import { acceptInvite } from './accept-invite';

function createMockPayload(
  overrides: {
    findDocs?: Record<string, unknown>[];
    loginToken?: string | null;
    adminUser?: string;
  } = {},
): Payload {
  const {
    findDocs = [],
    loginToken = 'jwt-token',
    adminUser = 'users',
  } = overrides;
  return {
    config: {
      admin: { user: adminUser },
      cookiePrefix: 'payload',
    },
    collections: {
      [adminUser]: {
        config: {
          auth: { tokenExpiration: 7200 },
        },
      },
    },
    find: vi.fn().mockResolvedValue({ docs: findDocs }),
    update: vi.fn().mockResolvedValue({}),
    login: vi.fn().mockResolvedValue({
      token: loginToken,
      user: { id: '1', email: 'test@test.com' },
    }),
  } as unknown as Payload;
}

vi.mock('payload', async (importOriginal) => {
  const mod = await importOriginal<typeof import('payload')>();
  return {
    ...mod,
    generatePayloadCookie: vi.fn(
      () =>
        'payload-token=jwt-token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200',
    ),
  };
});

describe('acceptInvite', () => {
  test('returns INVALID_TOKEN when no user found', async () => {
    const payload = createMockPayload({ findDocs: [] });
    const result = await acceptInvite({
      token: 'bad',
      password: 'pw',
      payload,
    });

    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('returns ALREADY_ACCEPTED when user is verified', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: true }],
    });
    const result = await acceptInvite({
      token: 'used',
      password: 'pw',
      payload,
    });

    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('verifies user, sets password, logs in, and returns cookie', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: false }],
    });

    const result = await acceptInvite({
      token: 'valid',
      password: 'newpw',
      payload,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user).toBeDefined();
      expect(result.token).toBe('jwt-token');
      expect(result.cookie).toHaveProperty('name');
      expect(result.cookie).toHaveProperty('value');
      expect(result.cookie).toHaveProperty('options');
    }

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          _verified: true,
          password: 'newpw',
        }),
      }),
    );

    expect(payload.login).toHaveBeenCalledWith({
      collection: 'users',
      data: { email: 'test@test.com', password: 'newpw' },
    });
  });
});
