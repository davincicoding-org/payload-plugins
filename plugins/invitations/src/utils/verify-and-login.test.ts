import type { Payload } from 'payload';
import { describe, expect, test, vi } from 'vitest';
import { verifyAndLogin } from './verify-and-login';

function createMockPayload(
  overrides: {
    findDocs?: Record<string, unknown>[];
    adminUser?: string;
    secret?: string;
  } = {},
): Payload {
  const {
    findDocs = [],
    adminUser = 'users',
    secret = 'test-secret',
  } = overrides;
  return {
    config: {
      admin: { user: adminUser },
      cookiePrefix: 'payload',
    },
    secret,
    collections: {
      [adminUser]: {
        config: {
          auth: { tokenExpiration: 7200 },
        },
      },
    },
    find: vi.fn().mockResolvedValue({ docs: findDocs }),
    update: vi.fn().mockResolvedValue({}),
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

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-jwt-token'),
  },
}));

describe('verifyAndLogin', () => {
  test('returns INVALID_TOKEN when no user found', async () => {
    const payload = createMockPayload({ findDocs: [] });
    const result = await verifyAndLogin({ token: 'bad', payload });
    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('returns ALREADY_ACCEPTED when user is verified', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: true }],
    });
    const result = await verifyAndLogin({ token: 'used', payload });
    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('verifies user, sets joinedAt, and returns cookie without requiring password', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: false }],
    });

    const result = await verifyAndLogin({ token: 'valid', payload });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBe('signed-jwt-token');
      expect(result.cookie).toHaveProperty('name');
      expect(result.rawCookie).toContain('payload-token');
    }

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          _verified: true,
          joinedAt: expect.any(String),
        }),
      }),
    );

    // Should NOT have a password in the update call
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          password: expect.anything(),
        }),
      }),
    );
  });

  test('re-saves _verificationToken after verification', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: false }],
    });

    await verifyAndLogin({ token: 'valid', payload });

    // Second update call re-saves the token
    expect(payload.update).toHaveBeenCalledTimes(2);
    expect(payload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { _verificationToken: 'valid' },
      }),
    );
  });
});
