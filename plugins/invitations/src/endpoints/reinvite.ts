import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { ENDPOINTS } from '../const';
import { sendInvitationEmail } from '../utils/send-invitation-email';

const STATUS_CODES: Record<string, number> = {
  sent: 200,
  already_accepted: 400,
  user_not_found: 404,
  flow_not_found: 400,
  no_invitation_flow: 400,
};

export const reinviteEndpoint = createEndpointHandler(
  ENDPOINTS.reinvite,
  async (req, { userId }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sendInvitationEmail({
      payload: req.payload,
      userId,
      req,
    });

    return Response.json(result, {
      status: STATUS_CODES[result.status] ?? 500,
    });
  },
);
