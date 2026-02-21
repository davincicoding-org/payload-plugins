import type { EmailAdapter, SendEmailOptions } from 'payload';

export const testEmailAdapter: EmailAdapter = () => ({
  name: 'test-email-adapter',
  defaultFromAddress: 'dev@test.com',
  defaultFromName: 'Test',
  sendEmail: async (message: SendEmailOptions) => {
    console.log(
      `[test-email] To: ${Array.isArray(message.to) ? message.to.join(', ') : message.to} | Subject: ${message.subject}`,
    );
  },
});
