import { describe, expect, test } from 'vitest';
import type { VerificationFlowConfig } from '../types';
import { resolveCreateFlow } from './resolve-create-flow';

const mockFlowConfig: VerificationFlowConfig = {
  emailSender: { email: 'test@test.com', name: 'Test' },
  generateEmailHTML: async () => '<p>test</p>',
  generateEmailSubject: async () => 'Test',
  acceptInvitationURL: 'https://example.com/verify',
};

describe('resolveCreateFlow', () => {
  test('returns admin-invite when password is undefined', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com' },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'admin-invite' });
  });

  test('returns admin-invite when password is empty string', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com', password: '' },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'admin-invite' });
  });

  test('returns admin-invite when password is null', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com', password: null },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'admin-invite' });
  });

  test('returns direct-create when password is provided', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com', password: 'secure123' },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'direct-create' });
  });

  test('returns verification-flow when _verificationFlow matches a configured flow', () => {
    const result = resolveCreateFlow({
      data: { _verificationFlow: 'self-signup' },
      verificationFlows: { 'self-signup': mockFlowConfig },
    });
    expect(result).toEqual({
      type: 'verification-flow',
      name: 'self-signup',
      config: mockFlowConfig,
    });
  });

  test('throws APIError when _verificationFlow does not match any configured flow', () => {
    expect(() =>
      resolveCreateFlow({
        data: { _verificationFlow: 'typo' },
        verificationFlows: { 'self-signup': mockFlowConfig },
      }),
    ).toThrow('Unknown verification flow: "typo"');
  });

  test('throws APIError when _verificationFlow is set but no flows are configured', () => {
    expect(() =>
      resolveCreateFlow({
        data: { _verificationFlow: 'self-signup' },
        verificationFlows: undefined,
      }),
    ).toThrow();
  });

  test('_verificationFlow takes precedence over password absence', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com', _verificationFlow: 'self-signup' },
      verificationFlows: { 'self-signup': mockFlowConfig },
    });
    expect(result.type).toBe('verification-flow');
  });
});
