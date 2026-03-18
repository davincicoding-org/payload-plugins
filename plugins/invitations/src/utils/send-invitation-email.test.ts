import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createSendInvitationEmail,
  type SendInvitationEmailResult,
} from './send-invitation-email';

describe('createSendInvitationEmail', () => {
  const mockSendEmail = vi.fn();
  const mockFind = vi.fn();

  const mockPayload = {
    sendEmail: mockSendEmail,
    find: mockFind,
    email: {
      defaultFromAddress: 'default@test.com',
      defaultFromName: 'Default',
    },
    config: { admin: { user: 'users' } },
  } as any;

  const defaultEmailSender = { email: 'invites@test.com', name: 'Test Co' };
  const defaultGenerateHTML = vi.fn(async () => '<html>invite</html>');
  const defaultGenerateSubject = vi.fn(async () => 'You are invited');
  const defaultResolveURL = vi.fn(
    async () => 'https://app.test/invite?token=abc',
  );

  let send: (options: {
    payload: any;
    userId: string | number;
    req?: any;
  }) => Promise<SendInvitationEmailResult>;

  beforeEach(() => {
    vi.clearAllMocks();

    send = createSendInvitationEmail({
      emailSender: defaultEmailSender,
      generateInvitationEmailHTML: defaultGenerateHTML,
      generateInvitationEmailSubject: defaultGenerateSubject,
      resolveInvitationURL: defaultResolveURL,
      verificationFlows: undefined,
    });
  });

  test('returns user_not_found when user does not exist', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await send({ payload: mockPayload, userId: 'nonexistent' });
    expect(result).toEqual({ status: 'user_not_found' });
  });

  test('returns already_accepted when no _verificationToken', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: null,
          _invitationFlow: 'admin-invite',
        },
      ],
    });

    const result = await send({ payload: mockPayload, userId: '1' });
    expect(result).toEqual({ status: 'already_accepted' });
  });

  test('returns no_invitation_flow when _invitationFlow is not set', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: 'token-abc',
          _invitationFlow: null,
        },
      ],
    });

    const result = await send({ payload: mockPayload, userId: '1' });
    expect(result).toEqual({ status: 'no_invitation_flow' });
  });

  test('returns flow_not_found for unknown verification flow', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: 'token-abc',
          _invitationFlow: 'removed-flow',
        },
      ],
    });

    const result = await send({ payload: mockPayload, userId: '1' });
    expect(result).toEqual({ status: 'flow_not_found' });
  });

  test('sends email and returns sent for admin-invite flow', async () => {
    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: 'token-abc',
          _invitationFlow: 'admin-invite',
        },
      ],
    });

    const result = await send({ payload: mockPayload, userId: '1' });

    expect(result).toEqual({ status: 'sent' });
    expect(mockSendEmail).toHaveBeenCalledWith({
      from: '"Test Co" <invites@test.com>',
      to: 'user@test.com',
      subject: 'You are invited',
      html: '<html>invite</html>',
    });
  });

  test('sends email for verification flow', async () => {
    const flowGenerateHTML = vi.fn(async () => '<html>verify</html>');
    const flowGenerateSubject = vi.fn(async () => 'Verify your email');
    const flowEmailSender = { email: 'verify@test.com', name: 'Verify Co' };

    const sendWithFlows = createSendInvitationEmail({
      emailSender: defaultEmailSender,
      generateInvitationEmailHTML: defaultGenerateHTML,
      generateInvitationEmailSubject: defaultGenerateSubject,
      resolveInvitationURL: defaultResolveURL,
      verificationFlows: {
        signup: {
          emailSender: flowEmailSender,
          generateEmailHTML: flowGenerateHTML,
          generateEmailSubject: flowGenerateSubject,
          acceptInvitationURL: 'https://app.test/verify',
        },
      },
    });

    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: 'token-abc',
          _invitationFlow: 'signup',
        },
      ],
    });

    const result = await sendWithFlows({ payload: mockPayload, userId: '1' });

    expect(result).toEqual({ status: 'sent' });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Verify Co" <verify@test.com>',
        to: 'user@test.com',
      }),
    );
  });

  test('falls back to Payload defaults when no emailSender for admin-invite', async () => {
    const sendNoSender = createSendInvitationEmail({
      emailSender: undefined,
      generateInvitationEmailHTML: defaultGenerateHTML,
      generateInvitationEmailSubject: defaultGenerateSubject,
      resolveInvitationURL: defaultResolveURL,
      verificationFlows: undefined,
    });

    mockFind.mockResolvedValue({
      docs: [
        {
          id: '1',
          email: 'user@test.com',
          _verificationToken: 'token-abc',
          _invitationFlow: 'admin-invite',
        },
      ],
    });

    const result = await sendNoSender({ payload: mockPayload, userId: '1' });

    expect(result).toEqual({ status: 'sent' });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Default" <default@test.com>',
      }),
    );
  });
});
