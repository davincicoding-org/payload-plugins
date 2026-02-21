import { createTestConfig } from '@davincicoding/payload-plugin-kit/testing';
import { discussionsPlugin } from 'payload-discussions';

export default createTestConfig({
  dirname: import.meta.dirname,
  plugins: [
    discussionsPlugin({
      collections: ['feature-requests'],
    }),
  ],
  collections: [
    {
      slug: 'feature-requests',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'createdBy', type: 'relationship', relationTo: 'users' },
      ],
    },
  ],
});
