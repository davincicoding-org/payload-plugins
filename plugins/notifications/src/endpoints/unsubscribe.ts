import { unsubscribe } from '@/api';
import { ENDPOINTS } from '@/procedures';

export const unsubscribeEndpoint = () =>
  ENDPOINTS.unsubscribe.endpoint(async (req, { documentReference }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await unsubscribe(req, req.user.id, documentReference);

    return { success: true as const };
  });
