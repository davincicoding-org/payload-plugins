import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

let payload: Payload;

beforeAll(async () => {
  const { default: config } = await import('@payload-config');
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload.destroy();
});

describe('invitations plugin', () => {
  test('adds joinedAt field to the users collection', () => {
    const usersConfig = payload.config.collections.find(
      (c) => c.slug === 'users',
    );
    expect(usersConfig).toBeDefined();

    const flatFields = usersConfig?.flattenedFields;
    const joinedAt = flatFields?.find((f) => f.name === 'joinedAt');
    expect(joinedAt).toBeDefined();
    expect(joinedAt?.type).toBe('date');
  });

  test('adds virtual _email field to the users collection', () => {
    const usersConfig = payload.config.collections.find(
      (c) => c.slug === 'users',
    );
    expect(usersConfig).toBeDefined();

    const flatFields = usersConfig?.flattenedFields;
    const emailField = flatFields?.find((f) => f.name === '_email');
    expect(emailField).toBeDefined();
    expect(emailField?.type).toBe('email');
  });

  test('sets auth.verify on the users collection', () => {
    const usersConfig = payload.config.collections.find(
      (c) => c.slug === 'users',
    );
    expect(usersConfig).toBeDefined();
    expect(usersConfig?.auth).toBeDefined();

    expect(usersConfig?.auth?.verify).toBeTruthy();
  });

  test('creating a user with _email auto-generates a password', async () => {
    const user = await payload.create({
      collection: 'users',
      data: {
        _email: 'invited@test.com',
      } as Record<string, unknown>,
    });

    expect(user.email).toBe('invited@test.com');
    expect(user.id).toBeDefined();
  });

  test('rejects duplicate email on create', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: {
          _email: 'invited@test.com',
        } as Record<string, unknown>,
      }),
    ).rejects.toThrow();
  });

  test('accept-invite endpoint is registered', () => {
    const endpoints = payload.config.endpoints;
    const acceptInvite = endpoints.find(
      (e) =>
        e.path === '/invitations-plugin/accept-invite' && e.method === 'post',
    );
    expect(acceptInvite).toBeDefined();
  });
});
