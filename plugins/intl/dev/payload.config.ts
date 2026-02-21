import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { intlPlugin } from 'payload-intl';

const messages = {
  navigation: {
    logoText: '{text}',
  },
  common: {
    greeting: 'Hello {name}!',
  },
} as const;

export default createTestConfig({
  dirname: import.meta.dirname,
  localization: {
    locales: ['en', 'de'],
    defaultLocale: 'en',
  },
  plugins: [
    intlPlugin({
      schema: messages,
      uploadCollection: 'media',
      scopes: { navigation: 'tab' },
    }),
  ],
  collections: [
    {
      slug: 'media',
      upload: true,
      fields: [],
    },
  ],
  globals: [
    {
      slug: 'navigation',
      fields: [{ name: 'logoText', type: 'text', localized: true }],
    },
  ],
});
