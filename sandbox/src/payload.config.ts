import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { resendAdapter } from '@payloadcms/email-resend';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { discussionsPlugin } from 'payload-discussions';
import { intlPlugin } from 'payload-intl';
import { invitationsPlugin } from 'payload-invitations';
import {
  getSubscribers,
  notificationsPlugin,
  notify,
  subscribe,
} from 'payload-notifications';
import { smartCachePlugin } from 'payload-smart-cache';
import { smartDeletionPlugin } from 'payload-smart-deletion';
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
    locales: ['en', 'de'],
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
    {
      slug: 'feature-requests',
      trash: true,
      admin: {
        useAsTitle: 'title',
        description:
          'Help improve the camp management system by sharing your ideas.',
      },

      hooks: {
        beforeChange: [
          ({ req, operation, data }) => {
            if (operation === 'create' && req.user) {
              data.createdBy = req.user.id;
            }

            return data;
          },
        ],
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'createdBy',
              type: 'relationship',
              relationTo: 'users',
              admin: {
                width: '250px',
                readOnly: true,
                condition: (data) => Boolean(data?.id),
              },
            },
          ],
        },

        {
          name: 'description',
          type: 'richText',
          required: true,
        },
      ],
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
    notificationsPlugin({
      email: {
        generateHTML: ({ notification }) => `<p>${notification.subject}</p>`,
        generateSubject: ({ notification }) => notification.subject,
      },
    }),
    discussionsPlugin({
      collections: ['feature-requests'],
      onComment: async ({
        req,
        comment,
        parentComment,
        documentId,
        collectionSlug,
      }) => {
        const authorId =
          typeof comment.author === 'object' && comment.author
            ? comment.author.id
            : comment.author;

        if (!authorId) return;

        // Auto-subscribe the commenter to this document
        await subscribe(req, authorId, documentId, collectionSlug, 'auto');

        // Get all subscribers for this document
        const subscribers = await getSubscribers(
          req,
          documentId,
          collectionSlug,
        );

        // Build actor info for the notification
        const actor =
          typeof comment.author === 'object' && comment.author
            ? {
                id: comment.author.id,
                displayName:
                  (comment.author as { email?: string }).email ?? 'Unknown',
              }
            : { id: authorId, displayName: 'Unknown' };

        const event = parentComment ? 'reply.created' : 'comment.created';

        // Notify all subscribers except the author
        const recipients = subscribers.filter(
          (id) => String(id) !== String(authorId),
        );

        for (const recipientId of recipients) {
          await notify(req, {
            recipient: recipientId,
            event,
            actor,
            subject: parentComment
              ? `${actor.displayName} replied to a comment`
              : `${actor.displayName} commented on a document`,
            url: `/admin/collections/${collectionSlug}/${documentId}`,
          });
        }
      },
    }),
    smartDeletionPlugin(),
    intlPlugin({
      schema: messages,
      tabs: true,
    }),
    smartCachePlugin({ collections: ['media', 'messages'] }),
    localFileStoragePlugin(),
  ],
});
