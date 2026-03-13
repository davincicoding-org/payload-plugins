import crypto from 'node:crypto';
import type { Payload, SendEmailOptions } from 'payload';
import { getPayload } from 'payload';
import { acceptInvite, getInviteData } from 'payload-invitations';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

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

const sentEmails: SendEmailOptions[] = [];

describe('invitations plugin', () => {
  beforeAll(() => {
    const originalSendEmail = payload.sendEmail.bind(payload);
    payload.sendEmail = async (message: SendEmailOptions) => {
      sentEmails.push(message);
      return originalSendEmail(message);
    };
  });

  beforeEach(() => {
    sentEmails.length = 0;
  });

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

  test('sets auth.verify on the users collection', () => {
    const usersConfig = payload.config.collections.find(
      (c) => c.slug === 'users',
    );
    expect(usersConfig).toBeDefined();
    expect(usersConfig?.auth).toBeDefined();

    expect(usersConfig?.auth?.verify).toBeTruthy();
  });

  test('creating a user without password auto-generates one and sends invite', async () => {
    const email = uniqueEmail('invited');
    const user = await payload.create({
      collection: 'users',
      data: {
        email,
      },
    });

    expect(user.email).toBe(email);
    expect(user.id).toBeDefined();
  });

  test('rejects duplicate email on create', async () => {
    const email = uniqueEmail('duplicate');
    await payload.create({
      collection: 'users',
      data: { email },
    });

    await expect(
      payload.create({
        collection: 'users',
        data: { email },
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
      data: { email },
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

  test('getInviteData returns ALREADY_ACCEPTED after invitation is accepted', async () => {
    const user = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail('double-click') },
    });

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const token = fullUser._verificationToken as string;

    // Accept the invitation
    await acceptInvite({ token, password: 'newSecurePassword123!', payload });

    // Simulate clicking the invitation link a second time
    const result = await getInviteData({ token, payload });
    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('getInviteData returns INVALID_TOKEN for bad token', async () => {
    const result = await getInviteData({ token: 'nonexistent', payload });
    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('acceptInvite verifies user and returns cookie', async () => {
    const user = await payload.create({
      collection: 'users',
      data: { email: uniqueEmail('accept') },
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
      data: { email: uniqueEmail('already-accepted') },
    });

    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const token = fullUser._verificationToken as string;

    // First acceptance should succeed
    const first = await acceptInvite({
      token,
      password: 'newSecurePassword123!',
      payload,
    });
    expect(first.success).toBe(true);

    // Second acceptance should return ALREADY_ACCEPTED
    const second = await acceptInvite({
      token,
      password: 'anything',
      payload,
    });
    expect(second).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('invitation email uses custom sender from emailSender config', async () => {
    const email = uniqueEmail('sender-test');
    await payload.create({
      collection: 'users',
      data: { email },
    });

    const invitation = sentEmails.find((e) =>
      (Array.isArray(e.to) ? e.to : [e.to]).some((addr) =>
        String(addr).includes(email),
      ),
    );
    expect(invitation).toBeDefined();
    expect(invitation?.from).toBe('"Tenant Co" <invites@tenant.com>');
  });

  test('invitation email contains invitation URL in body', async () => {
    const email = uniqueEmail('body-test');
    await payload.create({
      collection: 'users',
      data: { email },
    });

    const invitation = sentEmails.find((e) =>
      (Array.isArray(e.to) ? e.to : [e.to]).some((addr) =>
        String(addr).includes(email),
      ),
    );
    expect(invitation).toBeDefined();
    expect(String(invitation?.html)).toContain('Accept Invitation');
  });
});
