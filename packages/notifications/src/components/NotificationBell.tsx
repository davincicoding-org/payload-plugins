'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { Popover, type PopoverRootActions } from '@base-ui/react/popover';
import { Button, useAuth, useConfig } from '@payloadcms/ui';
import { IconAdjustments, IconBell } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toDocumentReference } from '@/helpers';
import type { User } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type {
  NotificationData,
  ResolvedPluginOptions,
  StoredDocumentReference,
} from '@/types';
import styles from './NotificationBell.module.css';
import { NotificationItem } from './NotificationItem';

export type NotificationBellProps = ResolvedPluginOptions<'pollInterval'>;

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const { user } = useAuth<User>();

  const popoverActions = useRef<PopoverRootActions>(null);

  const { unreadCount, refreshUnreadCount } = useUnreadCount(
    apiRoute,
    pollInterval,
  );
  const { unread, read, isLoading, fetchNotifications, setNotifications } =
    useNotificationList({ apiRoute });
  const { markRead, markAllRead, deleteNotification } = useNotificationActions(
    apiRoute,
    setNotifications,
    refreshUnreadCount,
  );

  const { prefs, togglePref, unsubscribe } = useNotificationPreferences(
    apiRoute,
    user,
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
                  </div>
                  <Collapsible.Panel className={styles.prefsPanel}>
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
                      onDelete={deleteNotification}
                      onMarkRead={markRead}
                      onUnsubscribe={unsubscribe}
                    />
                  ))}

                {read.length > 0 &&
                  read.map((n) => (
                    <NotificationItem
                      apiRoute={apiRoute}
                      key={n.id}
                      notification={n}
                      onDelete={deleteNotification}
                      onMarkRead={markRead}
                      onUnsubscribe={unsubscribe}
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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Polls the server for the current unread notification count. */
function useUnreadCount(apiRoute: string, pollInterval: number) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const { count } = await ENDPOINTS.unreadCount.call(apiRoute);
      setUnreadCount(count);
    } catch {
      // Poll will retry on next interval
    }
  }, [apiRoute]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, pollInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount, pollInterval]);

  return { unreadCount, refreshUnreadCount };
}

/** Fetches and partitions the notification list into unread/read. */
function useNotificationList({ apiRoute }: { apiRoute: string }) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { docs } = await ENDPOINTS.listNotifications.call(apiRoute);
      setNotifications(docs);
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

  return { unread, read, isLoading, fetchNotifications, setNotifications };
}

/** Optimistic mutations for the notification list. */
function useNotificationActions(
  apiRoute: string,
  setNotifications: React.Dispatch<React.SetStateAction<NotificationData[]>>,
  onMutate: () => void,
) {
  const markRead = useCallback(
    async (id: string | number) => {
      await ENDPOINTS.markRead.call(apiRoute, { id });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      onMutate();
    },
    [apiRoute, setNotifications, onMutate],
  );

  const markAllRead = useCallback(async () => {
    await ENDPOINTS.markAllRead.call(apiRoute);
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    onMutate();
  }, [apiRoute, setNotifications, onMutate]);

  const deleteNotification = useCallback(
    async (id: string | number) => {
      await ENDPOINTS.deleteNotification.call(apiRoute, { id });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onMutate();
    },
    [apiRoute, setNotifications, onMutate],
  );

  return { markRead, markAllRead, deleteNotification };
}

/** Reads and toggles user-level notification preferences. */
function useNotificationPreferences(
  apiRoute: string,
  user: User | null | undefined,
) {
  const prefs = user?.notificationPreferences;

  const togglePref = useCallback(
    async (field: keyof Required<User>['notificationPreferences']) => {
      if (!user) return;
      const current = prefs?.[field] ?? true;
      await ENDPOINTS.updatePreferences.call(apiRoute, {
        [field]: !current,
      });
    },
    [apiRoute, user, prefs],
  );

  const unsubscribe = useCallback(
    async (ref: StoredDocumentReference) => {
      await ENDPOINTS.unsubscribe.call(apiRoute, {
        documentReference: toDocumentReference(ref),
      });
    },
    [apiRoute],
  );

  return { prefs, togglePref, unsubscribe };
}
