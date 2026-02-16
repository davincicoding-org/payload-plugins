import type { CollectionSlug } from 'payload';
import { ENDPOINTS } from '@/procedures';

type LooseUpdateFn = (args: {
  collection: CollectionSlug;
  data: Record<string, unknown>;
  id: string | number;
  req?: unknown;
}) => Promise<unknown>;

export const markReadEndpoint = (notifSlug: CollectionSlug) =>
  ENDPOINTS.markRead.endpoint(async (req, { id }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await (req.payload.update as LooseUpdateFn)({
      collection: notifSlug,
      id,
      data: { readAt: new Date().toISOString() },
      req,
    });

    return { success: true as const };
  });
