import type { messages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
