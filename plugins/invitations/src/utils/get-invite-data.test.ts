import type { Payload } from 'payload';
import { describe, expect, test, vi } from 'vitest';

import { getInviteData } from './get-invite-data';

function createMockPayload(
  overrides: { docs?: Record<string, unknown>[]; adminUser?: string } = {},
): Payload {
  const { docs = [], adminUser = 'users' } = overrides;
  return {
    config: { admin: { user: adminUser } },
    find: vi.fn().mockResolvedValue({ docs }),
  } as unknown as Payload;
}

describe('getInviteData', () => {
  test('returns success with user when token is valid', async () => {
    const mockUser = {
      id: '1',
      email: 'invited@test.com',
      _verified: false,
      _verificationToken: 'valid-token',
      password: 'hashed',
      salt: 'salty',
      hash: 'hashy',
    };
    const payload = createMockPayload({ docs: [mockUser] });

    const result = await getInviteData({ token: 'valid-token', payload });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('invited@test.com');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('salt');
      expect(result.user).not.toHaveProperty('hash');
      expect(result.user).not.toHaveProperty('_verificationToken');
    }
  });

  test('returns INVALID_TOKEN when no user found', async () => {
    const payload = createMockPayload({ docs: [] });

    const result = await getInviteData({ token: 'bad-token', payload });

    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('returns ALREADY_ACCEPTED when user is already verified', async () => {
    const mockUser = {
      id: '1',
      email: 'invited@test.com',
      _verified: true,
      _verificationToken: 'used-token',
    };
    const payload = createMockPayload({ docs: [mockUser] });

    const result = await getInviteData({ token: 'used-token', payload });

    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('queries the correct collection with overrideAccess', async () => {
    const payload = createMockPayload({ docs: [], adminUser: 'members' });

    await getInviteData({ token: 'any', payload });

    expect(payload.find).toHaveBeenCalledWith({
      collection: 'members',
      where: { _verificationToken: { equals: 'any' } },
      overrideAccess: true,
      limit: 1,
    });
  });
});
