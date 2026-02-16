import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const unsubscribeEndpoint = (subscriptionsSlug: CollectionSlug) =>
  ENDPOINTS.unsubscribe.endpoint(
    async (req, { documentId, collectionSlug }) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await req.payload.delete({
        collection: subscriptionsSlug as 'subscriptions',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { documentId: { equals: documentId } },
            { collectionSlug: { equals: collectionSlug } },
          ],
        },
        req,
      });

      return { success: true as const };
    },
  );
