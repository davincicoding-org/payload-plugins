import { describe, expect, it, vi } from 'vitest';
import { resolveActor } from './resolve-actor';

function mockPayload({
  useAsTitle = 'name',
  userData = { id: '1', name: 'Jane', email: 'jane@test.com' },
}: {
  useAsTitle?: string;
  userData?: Record<string, unknown>;
} = {}) {
  return {
    config: {
      admin: { user: 'users' },
    },
    collections: {
      users: { config: { admin: { useAsTitle } } },
    },
    findByID: vi.fn().mockResolvedValue(userData),
  };
}

describe('resolveActor', () => {
  it('should resolve display name from useAsTitle field', async () => {
    const payload = mockPayload();
    const result = await resolveActor(payload as any, '1');

    expect(result).toEqual({ id: '1', displayName: 'Jane' });
    expect(payload.findByID).toHaveBeenCalledWith({
      collection: 'users',
      id: '1',
      depth: 0,
    });
  });

  it('should fall back to email when useAsTitle field is missing', async () => {
    const payload = mockPayload({
      useAsTitle: 'nickname',
      userData: { id: '2', email: 'bob@test.com' },
    });
    const result = await resolveActor(payload as any, '2');

    expect(result).toEqual({ id: '2', displayName: 'bob@test.com' });
  });

  it('should fall back to email when useAsTitle value is not a string', async () => {
    const payload = mockPayload({
      useAsTitle: 'role',
      userData: { id: '3', role: 42, email: 'c@test.com' },
    });
    const result = await resolveActor(payload as any, '3');

    expect(result).toEqual({ id: '3', displayName: 'c@test.com' });
  });

  it('should use default useAsTitle of email when admin config is absent', async () => {
    const payload = mockPayload();
    payload.collections.users.config.admin = {} as any;
    const result = await resolveActor(payload as any, '1');

    expect(result).toEqual({ id: '1', displayName: 'jane@test.com' });
  });
});
