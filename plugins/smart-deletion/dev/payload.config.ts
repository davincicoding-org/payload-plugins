import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { smartDeletionPlugin } from 'payload-smart-deletion';

export default createTestConfig({
  dirname: import.meta.dirname,
  plugins: [smartDeletionPlugin()],
  collections: [
    {
      slug: 'parents',
      admin: { useAsTitle: 'title' },
      trash: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'children',
          type: 'relationship',
          relationTo: 'children',
          hasMany: true,
          custom: { smartDeletion: 'cascade' },
        },
      ],
    },
    {
      slug: 'children',
      admin: { useAsTitle: 'title' },
      fields: [{ name: 'title', type: 'text', required: true }],
    },
  ],
});
