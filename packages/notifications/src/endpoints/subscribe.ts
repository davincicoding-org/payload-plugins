import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

export const subscribeEndpoint = (subscriptionsSlug: CollectionSlug) =>
  ENDPOINTS.subscribe.endpoint(async (req, { documentId, collectionSlug }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await req.payload.find({
      collection: subscriptionsSlug as 'subscriptions',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      limit: 1,
    });

    if (existing.totalDocs > 0) {
      return { success: true as const, alreadySubscribed: true };
    }

    await req.payload.create({
      collection: subscriptionsSlug as 'subscriptions',
      data: {
        user: req.user.id,
        documentId,
        collectionSlug,
        reason: 'manual',
      },
      req,
    });

    return { success: true as const };
  });
