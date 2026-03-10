import { describe, expect, test } from 'vitest';
import { createAutoGeneratePasswordHook } from './auto-generate-password';

const autoGeneratePassword = createAutoGeneratePasswordHook({
  verificationFlows: undefined,
});

describe('createAutoGeneratePasswordHook', () => {
  test('generates 64-char hex password on admin-invite create', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
      req: { context: {} },
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
      req: { context: {} },
    } as any);

    expect(result?.email).toBe('test@example.com');
  });

  test('returns new object (immutability)', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
      req: { context: {} },
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

  test('returns data unchanged when _verificationFlow is set', () => {
    const hook = createAutoGeneratePasswordHook({
      verificationFlows: {
        'self-signup': {
          emailSender: { email: 'test@test.com', name: 'Test' },
          generateEmailHTML: async () => '',
          generateEmailSubject: async () => '',
          acceptInvitationURL: 'https://example.com/verify',
        },
      },
    });
    const data = {
      _verificationFlow: 'self-signup',
      email: 'test@example.com',
      password: 'real-pw',
    };
    const result = hook({
      operation: 'create',
      data,
      req: { context: {} },
    } as any);

    expect(result).toBe(data);
    expect(result?.password).toBe('real-pw');
  });

  test('returns data unchanged for direct-create (no _email, no _verificationFlow)', () => {
    const data = { email: 'test@example.com', password: 'pw' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
      req: { context: {} },
    } as any);

    expect(result).toBe(data);
  });

  test('stashes flow on req.context.createFlow', () => {
    const req = { context: {} } as any;
    const data = { _email: 'test@example.com' };
    autoGeneratePassword({ operation: 'create', data, req } as any);

    expect(req.context.createFlow).toEqual({ type: 'admin-invite' });
  });
});
