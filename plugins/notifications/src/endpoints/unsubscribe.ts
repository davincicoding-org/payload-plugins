import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { unsubscribe } from '@/api';
import { ENDPOINTS } from '@/const';

export const unsubscribeEndpoint = () =>
  createEndpointHandler(
    ENDPOINTS.unsubscribe,
    async (req, { documentReference }) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await unsubscribe(req, req.user.id, documentReference);

      return { success: true as const };
    },
  );
