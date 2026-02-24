import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { ENDPOINTS } from '@/const';

export const updatePreferencesEndpoint = () =>
  createEndpointHandler(
    ENDPOINTS.updatePreferences,
    async (req, { emailEnabled }) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userSlug = req.payload.config.admin?.user as 'users' | undefined;
      if (!userSlug) {
        return Response.json(
          { error: 'User collection not configured' },
          { status: 500 },
        );
      }

      await req.payload.update({
        collection: userSlug,
        id: req.user.id,
        data: { notificationPreferences: { emailEnabled } },
        req,
      });

      return { success: true as const };
    },
  );
