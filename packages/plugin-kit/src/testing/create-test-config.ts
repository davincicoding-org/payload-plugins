import path from 'node:path';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type {
  CollectionConfig,
  Config,
  GlobalConfig,
  Payload,
  Plugin,
  SanitizedConfig,
} from 'payload';
import { buildConfig } from 'payload';
import { seedDevUser } from './seed';
import { testEmailAdapter } from './test-email-adapter';

export interface CreateTestConfigOptions {
  dirname: string;
  plugins: Plugin[];
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
  localization?: Config['localization'];
  onInit?: (payload: Payload) => Promise<void>;
}

export function createTestConfig({
  dirname,
  plugins,
  collections = [],
  globals = [],
  localization,
  onInit,
}: CreateTestConfigOptions): Promise<SanitizedConfig> {
  return buildConfig({
    db: sqliteAdapter({
      client: { url: `file:${path.resolve(dirname, 'payload.db')}` },
    }),
    secret: 'test-secret-for-dev-environment-only',
    email: testEmailAdapter,
    editor: lexicalEditor(),
    localization,
    collections: [
      {
        slug: 'users',
        auth: true,
        fields: [{ name: 'name', type: 'text' }],
      },
      ...collections,
    ],
    globals,
    plugins,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    admin: {
      user: 'users',
      importMap: { baseDir: path.resolve(dirname) },
    },
    onInit: async (payload) => {
      await seedDevUser(payload);
      await onInit?.(payload);
    },
  });
}
