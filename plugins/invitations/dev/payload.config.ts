import path from 'node:path';
import { testEmailAdapter } from '@davincicoding/payload-plugin-kit/testing';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { invitationsPlugin } from 'payload-invitations';

const DEV_USER = {
  _email: 'dev@test.com',
  name: 'Dev User',
} as const;

export default buildConfig({
  db: sqliteAdapter({
    client: { url: `file:${path.resolve(import.meta.dirname, 'payload.db')}` },
  }),
  secret: 'test-secret-for-dev-environment-only',
  email: testEmailAdapter,
  editor: lexicalEditor(),
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [{ name: 'name', type: 'text' }],
    },
  ],
  plugins: [invitationsPlugin()],
  typescript: {
    outputFile: path.resolve(import.meta.dirname, 'payload-types.ts'),
  },
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(import.meta.dirname) },
  },
  onInit: async (payload) => {
    const { totalDocs } = await payload.count({ collection: 'users' });
    if (totalDocs > 0) return;
    await payload.create({ collection: 'users', data: DEV_USER });
  },
});
