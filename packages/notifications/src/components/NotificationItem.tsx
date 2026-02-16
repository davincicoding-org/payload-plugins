'use client';

import { formatTimeToNow, useTranslation } from '@payloadcms/ui';
import { useRouter } from 'next/navigation.js';
import styles from './NotificationItem.module.css';

export interface NotificationData {
  id: string | number;
  event: string;
  actor: { id: string | number; displayName: string };
  subject: string;
  url?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string | number) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.url) router.push(notification.url);
  };

  return (
    <button
      className={styles.item}
      data-unread={isUnread}
      onClick={handleClick}
      type="button"
    >
      {isUnread && <span className={styles.dot} />}
      <div className={styles.content}>
        <p className={styles.subject}>{notification.subject}</p>
        <span className={styles.meta}>
          <span className={styles.actor}>{notification.actor.displayName}</span>
          <span className={styles.time}>
            {formatTimeToNow({ date: notification.createdAt, i18n })}
          </span>
        </span>
      </div>
    </button>
  );
}
