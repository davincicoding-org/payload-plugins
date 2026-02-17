import type { DocumentReference } from '@repo/common';
import { unsubscribe } from '@/api';
import { verifyUnsubscribeToken } from '@/email-token';
import { ENDPOINTS } from '@/procedures';

function htmlPage(title: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:#fff;border-radius:8px;padding:32px;max-width:400px;text-align:center;}</style>
</head><body><div class="card"><h2>${title}</h2><p>${message}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export const emailUnsubscribeEndpoint = () =>
  ENDPOINTS.emailUnsubscribe.endpoint(async (req, { token }) => {
    const payload = verifyUnsubscribeToken(req.payload.config.secret, token);

    if (!payload) {
      return htmlPage(
        'Invalid link',
        'This unsubscribe link is invalid or has been tampered with.',
      );
    }

    try {
      await unsubscribe(
        req,
        payload.userId,
        payload.documentReference as DocumentReference,
      );
    } catch {
      // Already unsubscribed or subscription didn't exist — that's fine
    }

    return htmlPage(
      'Unsubscribed',
      'You have been unsubscribed from these notifications.',
    );
  });
