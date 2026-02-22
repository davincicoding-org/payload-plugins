import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { smartCachePlugin } from 'payload-smart-cache';
import { fetchPosts } from './server';

export default createTestConfig({
  dirname: path.dirname(fileURLToPath(import.meta.url)),
  plugins: [
    smartCachePlugin({
      collections: ['posts'],
      onInvalidate: (entity) => {
        // Warm posts cache after a post has changed
        if (entity.type === 'collection' && entity.slug === 'posts') {
          fetchPosts();
        }
      },
    }),
  ],
  collections: [
    {
      slug: 'media',
      access: {
        read: () => true,
      },
      upload: true,
      fields: [],
    },
    {
      slug: 'posts',
      versions: {
        drafts: true,
      },
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'comments',
          type: 'relationship',
          relationTo: 'comments',
          hasMany: true,
        },
      ],
    },
    {
      slug: 'comments',
      fields: [{ name: 'content', type: 'textarea', required: true }],
    },
  ],
});
