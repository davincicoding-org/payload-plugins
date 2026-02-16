import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

type LooseUpdateFn = (args: {
  collection: CollectionSlug;
  data: Record<string, unknown>;
  where: Record<string, unknown>;
  req?: unknown;
}) => Promise<unknown>;

export const markAllReadEndpoint = (notifSlug: CollectionSlug) =>
  ENDPOINTS.markAllRead.endpoint(async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await (req.payload.update as LooseUpdateFn)({
      collection: notifSlug,
      where: {
        and: [
          { recipient: { equals: req.user.id } },
          { readAt: { exists: false } },
        ],
      },
      data: { readAt: new Date().toISOString() },
      req,
    });

    return { success: true as const };
  });
