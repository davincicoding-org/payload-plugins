import crypto from 'node:crypto';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { acceptInvite, getInviteData } from 'payload-invitations';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${crypto.randomBytes(4).toString('hex')}@test.com`;

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
    const email = uniqueEmail('invited');
    const user = await payload.create({
      collection: 'users',
      data: {
        _email: email,
      } as Record<string, unknown>,
    });

    expect(user.email).toBe(email);
    expect(user.id).toBeDefined();
  });

  test('rejects duplicate email on create', async () => {
    const email = uniqueEmail('duplicate');
    await payload.create({
      collection: 'users',
      data: { _email: email } as Record<string, unknown>,
    });

    await expect(
      payload.create({
        collection: 'users',
        data: { _email: email } as Record<string, unknown>,
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

  test('getInviteData returns user for valid token', async () => {
    const email = uniqueEmail('headless');
    const user = await payload.create({
      collection: 'users',
      data: { _email: email } as Record<string, unknown>,
    });

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const result = await getInviteData({
      token: fullUser._verificationToken as string,
      payload,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe(email);
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('_verificationToken');
    }
  });

  test('getInviteData returns INVALID_TOKEN for bad token', async () => {
    const result = await getInviteData({ token: 'nonexistent', payload });
    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('acceptInvite verifies user and returns cookie', async () => {
    const user = await payload.create({
      collection: 'users',
      data: { _email: uniqueEmail('accept') } as Record<string, unknown>,
    });

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const result = await acceptInvite({
      token: fullUser._verificationToken as string,
      password: 'newSecurePassword123!',
      payload,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBeDefined();
      expect(result.cookie.name).toBeDefined();
      expect(result.cookie.value).toBeDefined();
      expect(result.cookie.options).toBeDefined();
    }
  });

  test('acceptInvite returns ALREADY_ACCEPTED for verified user', async () => {
    const user = await payload.create({
      collection: 'users',
      data: { _email: uniqueEmail('already-accepted') } as Record<
        string,
        unknown
      >,
    });

    // Manually verify while keeping the token (Payload normally clears it)
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { _verified: true },
    });

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const result = await acceptInvite({
      token: fullUser._verificationToken as string,
      password: 'anything',
      payload,
    });

    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });
});
