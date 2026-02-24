import type { EmailAdapter, SendEmailOptions } from 'payload';

export const testEmailAdapter: EmailAdapter = () => ({
  name: 'test-email-adapter',
  defaultFromAddress: 'dev@test.com',
  defaultFromName: 'Test',
  sendEmail: async (message: SendEmailOptions) => {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    const body = message.html ?? message.text ?? message.body ?? '(empty)';

    console.log('┌──────────────────────────────────────');
    console.log(`│ To:      ${to}`);
    console.log(`│ Subject: ${message.subject}`);
    console.log('├──────────────────────────────────────');
    console.log(String(body));
    console.log('└──────────────────────────────────────');
  },
});
