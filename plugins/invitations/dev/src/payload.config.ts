import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { testEmailAdapter } from '@davincicoding/payload-plugin-kit/testing';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { invitationsPlugin } from 'payload-invitations';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  db: sqliteAdapter({
    client: { url: `file:${path.resolve(dirname, 'payload.db')}` },
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
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
  },
  onInit: async (payload) => {
    const { totalDocs } = await payload.count({ collection: 'users' });
    if (totalDocs > 0) return;

    // Provide email + password directly (not _email) so the
    // autoGeneratePassword hook is skipped and we have known credentials.
    await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'dev@test.com',
        password: 'test1234',
        name: 'Dev User',
        _verified: true,
      },
    });
  },
});
