import { ENDPOINTS } from '../const';

export const acceptInviteEndpoint = ENDPOINTS.acceptInvite.endpoint(
  async (req, { token, password }) => {
    const usersCollection = req.payload.config.admin.user as 'users';

    const {
      docs: [user],
    } = await req.payload.find({
      collection: usersCollection,
      where: { _verificationToken: { equals: token } },
      overrideAccess: true,
      limit: 1,
    });

    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Verify + set password
    await req.payload.update({
      collection: usersCollection,
      id: user.id,
      overrideAccess: true,
      data: { _verified: true, password, joinedAt: new Date().toISOString() },
    });

    // Log the user in
    const loginResult = await req.payload.login({
      collection: usersCollection,
      data: { email: user.email, password },
    });

    if (!loginResult.token) {
      return Response.json({ error: 'Failed to login' }, { status: 400 });
    }

    // Set the auth cookie
    const { generatePayloadCookie } = await import('payload');
    const cookie = generatePayloadCookie({
      collectionAuthConfig:
        req.payload.collections[usersCollection].config.auth,
      cookiePrefix: req.payload.config.cookiePrefix,
      token: loginResult.token,
    });

    return Response.json(
      { success: true, user: loginResult.user },
      {
        headers: { 'Set-Cookie': cookie },
      },
    );
  },
);
