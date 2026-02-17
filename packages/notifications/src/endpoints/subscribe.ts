import { subscribe } from '@/api';
import { ENDPOINTS } from '@/procedures';

export const subscribeEndpoint = () =>
  ENDPOINTS.subscribe.endpoint(async (req, { documentReference }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await subscribe(req, {
      userId: req.user.id,
      documentReference,
      reason: 'manual',
    });

    return { success: true as const };
  });
