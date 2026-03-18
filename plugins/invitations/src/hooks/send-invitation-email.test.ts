import { describe, expect, test, vi } from 'vitest';
import { createSendInvitationEmailHook } from './send-invitation-email';

describe('createSendInvitationEmailHook', () => {
  const mockSendEmail = vi.fn(async () => ({ status: 'sent' as const }));

  test('skips email when req.context.skipInvitationEmail is true', async () => {
    const hook = createSendInvitationEmailHook({ sendEmail: mockSendEmail });
    const doc = { id: '1', email: 'test@test.com' };

    const result = await hook({
      doc,
      operation: 'create',
      req: { context: { skipInvitationEmail: true }, payload: {} },
      collection: { slug: 'users' },
    } as any);

    expect(result).toBe(doc);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  test('calls sendEmail when not suppressed', async () => {
    const hook = createSendInvitationEmailHook({ sendEmail: mockSendEmail });
    const doc = { id: '1', email: 'test@test.com' };

    await hook({
      doc,
      operation: 'create',
      req: { context: {}, payload: { id: 'mock-payload' } },
      collection: { slug: 'users' },
    } as any);

    expect(mockSendEmail).toHaveBeenCalledWith({
      payload: { id: 'mock-payload' },
      userId: '1',
      req: expect.anything(),
    });
  });

  test('skips on non-create operations', async () => {
    const hook = createSendInvitationEmailHook({ sendEmail: mockSendEmail });
    mockSendEmail.mockClear();

    const doc = { id: '1', email: 'test@test.com' };
    const result = await hook({
      doc,
      operation: 'update',
      req: { context: {} },
    } as any);

    expect(result).toBe(doc);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
