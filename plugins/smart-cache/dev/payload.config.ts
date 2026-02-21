import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { smartCachePlugin } from 'payload-smart-cache';

export default createTestConfig({
  dirname: import.meta.dirname,
  plugins: [smartCachePlugin({ collections: ['posts'] })],
  collections: [
    {
      slug: 'media',
      upload: true,
      fields: [],
    },
    {
      slug: 'posts',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
});
