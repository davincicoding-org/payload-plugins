'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { Popover, type PopoverRootActions } from '@base-ui/react/popover';
import { Button, useAuth, useConfig } from '@payloadcms/ui';
import type { DocumentReference } from '@repo/common';
import { IconAdjustments, IconBell } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const popoverActions = useRef<PopoverRootActions>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        // Map stored subject JSON to a display string
        const mapped = data.docs.map((doc: any) => ({
          ...doc,
          subject:
            typeof doc.subject === 'string'
              ? doc.subject
              : doc.subject?.type === 'static'
                ? doc.subject.value
                : (doc.subject?.fallbackValue ?? '...'),
        }));
        setNotifications(mapped);
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
    async (documentReference: DocumentReference) => {
      await ENDPOINTS.unsubscribe.call(apiRoute, { documentReference });
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
    <Popover.Root
      actionsRef={popoverActions}
      onOpenChange={(open) => {
        if (!open) return;
        fetchNotifications();
      }}
    >
      <Popover.Trigger render={<Button buttonStyle="tab" />}>
        <div className={styles.bellIcon}>
          <IconBell size={20} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className={styles.indicator}>{unreadCount}</span>
          )}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={8}>
          <Popover.Popup className={styles.popoverPopup}>
            <Popover.Arrow className={styles.popoverArrow}>
              {/** biome-ignore lint/a11y/noSvgWithoutTitle: gracefully ignored */}
              <svg fill="none" height="10" viewBox="0 0 20 10" width="20">
                <path d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z" />
              </svg>
            </Popover.Arrow>
            <Popover.Viewport className={styles.popoverViewport}>
              <Collapsible.Root>
                <div className={styles.panelTop}>
                  <div className={styles.header}>
                    <h3 className={styles.title}>Notifications</h3>
                    <Collapsible.Trigger
                      aria-label="Notification settings"
                      className={styles.headerAction}
                      type="button"
                    >
                      <IconAdjustments size={18} strokeWidth={1.5} />
                    </Collapsible.Trigger>
                    {/*<button
                    className={styles.markAll}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllRead();
                    }}
                    type="button"
                  >
                    Mark all as read
                  </button>*/}
                  </div>
                  <Collapsible.Panel className={styles.prefsPanel}>
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
                  </Collapsible.Panel>
                </div>
              </Collapsible.Root>
              <div className={styles.sections}>
                {isLoading && <p className={styles.empty}>Loading...</p>}

                {!isLoading && unread.length === 0 && read.length === 0 && (
                  <p className={styles.empty}>No notifications</p>
                )}

                {unread.length > 0 &&
                  unread.map((n) => (
                    <NotificationItem
                      apiRoute={apiRoute}
                      key={n.id}
                      notification={n}
                      onDelete={handleDelete}
                      onMarkRead={markRead}
                      onUnsubscribe={handleUnsubscribe}
                    />
                  ))}

                {read.length > 0 &&
                  read.map((n) => (
                    <NotificationItem
                      apiRoute={apiRoute}
                      key={n.id}
                      notification={n}
                      onDelete={handleDelete}
                      onMarkRead={markRead}
                      onUnsubscribe={handleUnsubscribe}
                    />
                  ))}
              </div>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
