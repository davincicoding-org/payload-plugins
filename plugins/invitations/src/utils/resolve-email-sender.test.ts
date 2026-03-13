import type { PayloadRequest, TypedUser } from 'payload';
import { describe, expect, test } from 'vitest';
import type { EmailSenderOption } from '../types';
import { resolveEmailSender } from './resolve-email-sender';

const mockReq = {} as PayloadRequest;
const mockUser = { id: 1, email: 'user@test.com' } as unknown as TypedUser;

describe('resolveEmailSender', () => {
  test('returns static email sender as-is', async () => {
    const sender: EmailSenderOption = {
      email: 'noreply@acme.com',
      name: 'Acme',
    };
    const result = await resolveEmailSender({
      emailSender: sender,
      req: mockReq,
      user: mockUser,
    });
    expect(result).toEqual({ email: 'noreply@acme.com', name: 'Acme' });
  });

  test('calls function email sender and returns result', async () => {
    const sender: EmailSenderOption = ({ user }) => ({
      email: `noreply-${user.id}@acme.com`,
      name: 'Acme',
    });
    const result = await resolveEmailSender({
      emailSender: sender,
      req: mockReq,
      user: mockUser,
    });
    expect(result).toEqual({ email: 'noreply-1@acme.com', name: 'Acme' });
  });

  test('handles async function email sender', async () => {
    const sender: EmailSenderOption = async () => ({
      email: 'async@acme.com',
      name: 'Async',
    });
    const result = await resolveEmailSender({
      emailSender: sender,
      req: mockReq,
      user: mockUser,
    });
    expect(result).toEqual({ email: 'async@acme.com', name: 'Async' });
  });
});
