import { documentReferenceSchema } from '@davincicoding/payload-plugin-kit';
import { unsubscribe } from '@/api';
import { verifyUnsubscribeToken } from '@/email/email-token';
import { ENDPOINTS } from '@/procedures';

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlPage(title: string, message: string, status = 200): Response {
  const safeTitle = escapeHTML(title);
  const safeMessage = escapeHTML(message);
  return new Response(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:#fff;border-radius:8px;padding:32px;max-width:400px;text-align:center;}</style>
</head><body><div class="card"><h2>${safeTitle}</h2><p>${safeMessage}</p></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export const emailUnsubscribeEndpoint = () =>
  ENDPOINTS.emailUnsubscribe.endpoint(async (req, { token }) => {
    const payload = verifyUnsubscribeToken(req.payload.config.secret, token);

    if (!payload) {
      return htmlPage(
        'Invalid link',
        'This unsubscribe link is invalid or has been tampered with.',
        400,
      );
    }

    const docRef = documentReferenceSchema.safeParse(payload.documentReference);
    if (!docRef.success) {
      return htmlPage(
        'Invalid link',
        'This unsubscribe link contains invalid data.',
        400,
      );
    }

    try {
      await unsubscribe(req, payload.userId, docRef.data);
    } catch {
      // Already unsubscribed or subscription didn't exist — that's fine
    }

    return htmlPage(
      'Unsubscribed',
      'You have been unsubscribed from these notifications.',
    );
  });
