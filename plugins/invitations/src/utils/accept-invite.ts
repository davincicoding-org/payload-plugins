import type { Payload } from 'payload';

function parseCookie(cookieString: string) {
  const parts = cookieString.split(';').map((p) => p.trim());
  const [nameValue = '', ...attributes] = parts;
  const [name = '', value = ''] = nameValue.split('=', 2);

  const options: Record<string, unknown> = {};
  for (const attr of attributes) {
    const [key = '', val] = attr.split('=', 2);
    const lowerKey = key.toLowerCase().trim();
    if (lowerKey === 'httponly') options.httpOnly = true;
    else if (lowerKey === 'secure') options.secure = true;
    else if (lowerKey === 'path') options.path = val;
    else if (lowerKey === 'samesite') options.sameSite = val?.toLowerCase();
    else if (lowerKey === 'max-age') options.maxAge = Number(val);
  }

  return { name, value, options };
}

export async function acceptInvite({
  token,
  password,
  payload,
}: {
  token: string;
  password: string;
  payload: Payload;
}) {
  const usersCollection = payload.config.admin.user as 'users';

  const {
    docs: [user],
  } = await payload.find({
    collection: usersCollection,
    where: { _verificationToken: { equals: token } },
    overrideAccess: true,
    limit: 1,
  });

  if (!user)
    return { success: false as const, error: 'INVALID_TOKEN' as const };

  if (user._verified)
    return { success: false as const, error: 'ALREADY_ACCEPTED' as const };

  await payload.update({
    collection: usersCollection,
    id: user.id,
    overrideAccess: true,
    data: { _verified: true, password, joinedAt: new Date().toISOString() },
  });

  const loginResult = await payload.login({
    collection: usersCollection,
    data: { email: user.email, password },
  });

  const { generatePayloadCookie } = await import('payload');
  const cookieString = generatePayloadCookie({
    collectionAuthConfig: payload.collections[usersCollection].config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token: loginResult.token ?? '',
  });

  return {
    success: true as const,
    user: loginResult.user,
    token: loginResult.token ?? '',
    cookie: parseCookie(cookieString),
    rawCookie: cookieString,
  };
}
