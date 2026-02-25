import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { ENDPOINTS } from '../const';
import { acceptInvite } from '../utils/accept-invite';

export const acceptInviteEndpoint = createEndpointHandler(
  ENDPOINTS.acceptInvite,
  async (req, { token, password }) => {
    const result = await acceptInvite({
      token,
      password,
      payload: req.payload,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      { success: true, user: result.user },
      { headers: { 'Set-Cookie': result.rawCookie } },
    );
  },
);
