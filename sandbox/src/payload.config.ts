import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { resendAdapter } from '@payloadcms/email-resend';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { intlPlugin } from 'payload-intl';
import { invitationsPlugin } from 'payload-invitations';
import { smartCachePlugin } from 'payload-smart-cache';
import sharp from 'sharp';

import { localFileStoragePlugin } from './cms/dev-plugins';
import { env } from './env';
import { messages } from './i18n/messages';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  serverURL: env.BASE_URL,
  localization: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  collections: [
    {
      slug: 'users',
      admin: {
        useAsTitle: 'email',
      },
      auth: true,
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        {
          name: 'role',
          type: 'select',
          options: ['admin', 'editor'],
          defaultValue: 'editor',
        },
      ],
    },
    {
      slug: 'media',
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'alt',
          type: 'text',
          required: true,
        },
      ],
      upload: true,
    },
  ],
  email: resendAdapter({
    defaultFromAddress: 'noreply@davincicoding.ch',
    defaultFromName: 'Davinci Coding',
    apiKey: env.RESEND_API_KEY,
  }),
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  sharp,
  plugins: [
    invitationsPlugin({}),
    intlPlugin({
      schema: messages,
    }),
    smartCachePlugin({ collections: ['media'] }),
    localFileStoragePlugin(),
  ],
});
