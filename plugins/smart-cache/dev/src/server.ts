import payloadConfig from '@payload-config';
import { getPayload } from 'payload';
import { createRequestHandler } from 'payload-smart-cache';

export const fetchPosts = createRequestHandler(async () => {
  const payload = await getPayload({ config: payloadConfig });

  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      _status: { equals: 'published' },
    },
  });

  return docs;
}, ['posts']);
