import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { intlPlugin } from 'payload-intl';
import { smartCachePlugin } from 'payload-smart-cache';
import sharp from 'sharp';
import { Media } from './cms/collections/Media';
import { Users } from './cms/collections/Users';
import { localFileStoragePlugin } from './cms/dev-plugins';
import { env } from './env';
import { messages } from './i18n/messages';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  serverURL: env.BASE_URL,
  localization: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  collections: [Users, Media],
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
    intlPlugin({
      schema: messages,
    }),
    smartCachePlugin({
      collections: {
        users: false,
      },
    }),
    localFileStoragePlugin(),
  ],
});
