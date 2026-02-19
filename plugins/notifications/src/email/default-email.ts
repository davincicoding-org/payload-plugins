import type {
  MinimalNotification,
  NotificationEmailLinks,
  ResolvedUser,
} from '../types';

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EmailArgs {
  notification: MinimalNotification;
  recipient: ResolvedUser;
  links: NotificationEmailLinks;
}

export function defaultGenerateSubject(_args: EmailArgs): string {
  return 'New notification';
}

export function defaultGenerateHTML({
  notification,
  recipient,
  links,
}: EmailArgs): string {
  const unsubscribeBlock = links.unsubscribeURL
    ? `<p style="margin-top:32px;font-size:12px;color:#666;">
        <a href="${links.unsubscribeURL}" style="color:#666;">Unsubscribe</a> from these notifications.
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 16px;font-size:15px;color:#333;">Hi ${escapeHTML(recipient.displayName)},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;">${escapeHTML(notification.message)}</p>
          <a href="${links.openURL}"
             style="display:inline-block;padding:10px 20px;background:#333;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">
            View notification
          </a>
          ${unsubscribeBlock}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
