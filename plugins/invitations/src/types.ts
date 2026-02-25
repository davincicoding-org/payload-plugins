import type { PayloadRequest, TypedUser } from 'payload';
import { z } from 'zod';

export type AcceptInvitationURLFn = (args: {
  token: string;
  user: TypedUser;
  req: PayloadRequest;
  defaultURL: string;
}) => string | Promise<string>;

const cookieOptionsSchema = z.object({
  httpOnly: z.boolean().optional(),
  secure: z.boolean().optional(),
  path: z.string().optional(),
  sameSite: z.string().optional(),
  maxAge: z.number().optional(),
});

const parsedCookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  options: cookieOptionsSchema,
});

export type ParsedCookie = z.infer<typeof parsedCookieSchema>;

export const cookieStringSchema = z
  .string()
  .transform((cookieString): ParsedCookie => {
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

    return parsedCookieSchema.parse({ name, value, options });
  });

export type InviteError = 'INVALID_TOKEN' | 'ALREADY_ACCEPTED';

export type SanitizedUser = Omit<
  TypedUser,
  'password' | 'salt' | 'hash' | '_verificationToken'
>;

export type GetInviteDataResult =
  | { success: true; user: SanitizedUser }
  | { success: false; error: InviteError };

export type AcceptInviteResult =
  | {
      success: true;
      user: TypedUser;
      token: string;
      cookie: ParsedCookie;
      rawCookie: string;
    }
  | { success: false; error: InviteError };

export const reinviteSchema = z.object({
  userId: z.union([z.string(), z.number()]),
});

export const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string(),
});

export type ReinviteInput = z.infer<typeof reinviteSchema>;
