'use client';

import {
  Collapsible,
  GearIcon,
  Pill,
  Popup,
  useAuth,
  useConfig,
} from '@payloadcms/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ENDPOINTS } from '@/procedures';
import styles from './NotificationBell.module.css';
import type { NotificationData } from './NotificationItem';
import { NotificationItem } from './NotificationItem';

interface NotificationBellProps {
  pollInterval: number;
}

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const prefs = user?.notificationPreferences as
    | { emailEnabled?: boolean; inAppEnabled?: boolean }
    | undefined;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await ENDPOINTS.unreadCount.call(apiRoute);
      setUnreadCount(count);
    } catch {
      // Poll will retry on next interval
    }
  }, [apiRoute]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, pollInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
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
  }, [apiRoute]);

  const { unread, read } = useMemo(() => {
    const unread: NotificationData[] = [];
    const read: NotificationData[] = [];
    for (const n of notifications) {
      if (n.readAt) read.push(n);
      else unread.push(n);
    }
    return { unread, read };
  }, [notifications]);

  const markRead = useCallback(
    async (id: string | number) => {
      await ENDPOINTS.markRead.call(apiRoute, { id });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      fetchUnreadCount();
    },
    [apiRoute, fetchUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    await ENDPOINTS.markAllRead.call(apiRoute);
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    fetchUnreadCount();
  }, [apiRoute, fetchUnreadCount]);

  const handleUnsubscribe = useCallback(
    async (documentId: string, collectionSlug: string) => {
      await ENDPOINTS.unsubscribe.call(apiRoute, {
        documentId,
        collectionSlug,
      });
    },
    [apiRoute],
  );

  const handleDelete = useCallback(
    async (id: string | number) => {
      await ENDPOINTS.deleteNotification.call(apiRoute, { id });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchUnreadCount();
    },
    [apiRoute, fetchUnreadCount],
  );

  const togglePref = useCallback(
    async (field: 'emailEnabled' | 'inAppEnabled') => {
      if (!user) return;
      const current = prefs?.[field] ?? true;
      await fetch(`${apiRoute}/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationPreferences: { ...prefs, [field]: !current },
        }),
      });
    },
    [apiRoute, user, prefs],
  );

  return (
    <Popup
      button={
        <span className={styles.bellButton}>
          <BellIcon />
          {unreadCount > 0 && (
            <Pill pillStyle="dark" size="small">
              {String(unreadCount)}
            </Pill>
          )}
        </span>
      }
      buttonType="custom"
      className={styles.popup}
      horizontalAlign="right"
      onToggleOpen={fetchNotifications}
      render={({ close }) => (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3 className={styles.title}>Notifications</h3>
            <button
              aria-label="Notification settings"
              className={styles.headerAction}
              onClick={(e) => {
                e.stopPropagation();
                setPrefsOpen((p) => !p);
              }}
              type="button"
            >
              <GearIcon />
            </button>
            <button
              className={styles.markAll}
              onClick={(e) => {
                e.stopPropagation();
                markAllRead();
              }}
              type="button"
            >
              Mark all as read
            </button>
          </div>

          <Collapsible
            className={styles.prefs}
            disableHeaderToggle
            disableToggleIndicator
            header={<span className={styles.prefsLabel}>Preferences</span>}
            initCollapsed={!prefsOpen}
            isCollapsed={!prefsOpen}
          >
            <label className={styles.prefRow}>
              <input
                checked={prefs?.inAppEnabled ?? true}
                onChange={() => togglePref('inAppEnabled')}
                type="checkbox"
              />
              In-app notifications
            </label>
            <label className={styles.prefRow}>
              <input
                checked={prefs?.emailEnabled ?? true}
                onChange={() => togglePref('emailEnabled')}
                type="checkbox"
              />
              Email notifications
            </label>
          </Collapsible>

          <div className={styles.sections}>
            {isLoading && <p className={styles.empty}>Loading...</p>}

            {!isLoading && unread.length === 0 && read.length === 0 && (
              <p className={styles.empty}>No notifications</p>
            )}

            {unread.length > 0 && (
              <>
                <span className={styles.sectionLabel}>New</span>
                {unread.map((n) => (
                  <NotificationItem
                    closePanel={close}
                    key={n.id}
                    notification={n}
                    onDelete={handleDelete}
                    onMarkRead={markRead}
                    onUnsubscribe={handleUnsubscribe}
                  />
                ))}
              </>
            )}

            {read.length > 0 && (
              <>
                <span className={styles.sectionLabel}>Earlier</span>
                {read.map((n) => (
                  <NotificationItem
                    closePanel={close}
                    key={n.id}
                    notification={n}
                    onDelete={handleDelete}
                    onMarkRead={markRead}
                    onUnsubscribe={handleUnsubscribe}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
      showScrollbar
      size="large"
    />
  );
}

function BellIcon() {
  return (
    <svg
      aria-label="Notifications"
      className={styles.bellIcon}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Notifications</title>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
