'use client';

import { Drawer, useConfig } from '@payloadcms/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './NotificationDrawer.module.css';
import type { NotificationData } from './NotificationItem';
import { NotificationItem } from './NotificationItem';

export const NOTIFICATIONS_DRAWER_SLUG = 'notifications-drawer';

interface NotificationDrawerProps {
  onRead: () => void;
}

export function NotificationDrawer({ onRead }: NotificationDrawerProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `${apiRoute}/notifications?sort=-createdAt&limit=20&depth=0`,
          { credentials: 'include' },
        );
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.docs);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, [apiRoute]);

  const markRead = useCallback(
    async (id: string | number) => {
      await fetch(`${apiRoute}/notifications-plugin/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      onRead();
    },
    [apiRoute, onRead],
  );

  const markAllRead = useCallback(async () => {
    await fetch(`${apiRoute}/notifications-plugin/mark-all-read`, {
      method: 'POST',
      credentials: 'include',
    });
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    onRead();
  }, [apiRoute, onRead]);

  return (
    <Drawer
      Header={
        <div className={styles.header}>
          <h3 className={styles.title}>Notifications</h3>
          <button
            className={styles.markAll}
            onClick={markAllRead}
            type="button"
          >
            Mark all as read
          </button>
        </div>
      }
      slug={NOTIFICATIONS_DRAWER_SLUG}
      title="Notifications"
    >
      <div className={styles.list}>
        {isLoading && <p className={styles.empty}>Loading...</p>}
        {!isLoading && notifications.length === 0 && (
          <p className={styles.empty}>No notifications</p>
        )}
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={markRead}
          />
        ))}
      </div>
    </Drawer>
  );
}
