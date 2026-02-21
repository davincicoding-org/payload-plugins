import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { notificationsPlugin } from 'payload-notifications';

export default createTestConfig({
  dirname: import.meta.dirname,
  plugins: [notificationsPlugin({ email: true })],
});
