import { describe, expect, it } from 'vitest';
import type {
  MinimalNotification,
  NotificationEmailLinks,
  ResolvedUser,
} from '../types';
import { defaultGenerateHTML, defaultGenerateSubject } from './default-email';

const notification: MinimalNotification = {
  message: 'Alice commented on your post',
  event: 'comment.created',
};

const recipient = {
  id: '1',
  email: 'bob@example.com',
  displayName: 'Bob',
} as ResolvedUser;

const links: NotificationEmailLinks = {
  openURL: 'https://example.com/api/notifications-plugin/open?id=notif-1',
  unsubscribeURL:
    'https://example.com/api/notifications-plugin/email-unsubscribe?token=abc',
};

describe('defaultGenerateSubject', () => {
  it('should return a static subject', () => {
    const subject = defaultGenerateSubject({ notification, recipient, links });
    expect(subject).toBe('New notification');
  });
});

describe('defaultGenerateHTML', () => {
  it('should include the notification message', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain('Alice commented on your post');
  });

  it('should include the open URL as a link', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain(links.openURL);
  });

  it('should include the unsubscribe URL when present', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain(links.unsubscribeURL);
  });

  it('should omit unsubscribe link when unsubscribeURL is undefined', () => {
    const html = defaultGenerateHTML({
      notification,
      recipient,
      links: { openURL: links.openURL, unsubscribeURL: undefined },
    });
    expect(html).not.toContain('Unsubscribe');
  });

  it('should greet the recipient by display name', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain('Bob');
  });
});
