import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

type LooseCreateFn = (args: {
  collection: CollectionSlug;
  data: Record<string, unknown>;
  req?: unknown;
}) => Promise<unknown>;

export const subscribeEndpoint = (subsSlug: CollectionSlug) =>
  ENDPOINTS.subscribe.endpoint(async (req, { documentId, collectionSlug }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await req.payload.find({
      collection: subsSlug,
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

    await (req.payload.create as LooseCreateFn)({
      collection: subsSlug,
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
