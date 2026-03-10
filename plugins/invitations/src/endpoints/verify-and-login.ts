import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { ENDPOINTS } from '../const';
import { verifyAndLogin } from '../utils/verify-and-login';

export const verifyAndLoginEndpoint = createEndpointHandler(
  ENDPOINTS.verifyAndLogin,
  async (req, { token }) => {
    const result = await verifyAndLogin({
      token,
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
