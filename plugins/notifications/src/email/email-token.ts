import { createHmac, timingSafeEqual } from 'node:crypto';

interface UnsubscribePayload {
  userId: string | number;
  documentReference: {
    entity: 'collection' | 'global';
    slug: string;
    id?: string | number;
  };
}

/**
 * Sign an unsubscribe payload into a URL-safe token.
 * Format: `{base64url(json)}.{base64url(hmac)}`
 */
export function signUnsubscribeToken(
  secret: string,
  payload: UnsubscribePayload,
): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/** Verify and decode an unsubscribe token. Returns null if invalid. */
export function verifyUnsubscribeToken(
  secret: string,
  token: string,
): UnsubscribePayload | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);

  const expectedSig = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}
