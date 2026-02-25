'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { Popover } from '@base-ui/react/popover';
import { useEndpointCallers } from '@davincicoding/payload-plugin-kit/client';
import { Button, useAuth } from '@payloadcms/ui';
import { IconAdjustments, IconBell } from '@tabler/icons-react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ENDPOINTS } from '@/const';
import { toDocumentReference } from '@/helpers';
import type { User } from '@/payload-types';
import type { ResolvedPluginOptions, StoredDocumentReference } from '@/types';
import styles from './NotificationBell.module.css';
import { NotificationItem } from './NotificationItem';
import {
  INITIAL_STATE,
  type NotificationAction,
  type NotificationState,
  notificationReducer,
} from './notification-reducer';

type Api = ReturnType<typeof useEndpointCallers<typeof ENDPOINTS>>;

export type NotificationBellProps = ResolvedPluginOptions<'pollInterval'>;

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const api = useEndpointCallers(ENDPOINTS);
  const { user } = useAuth<User>();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [state, dispatch] = useReducer(notificationReducer, INITIAL_STATE);

  useUnreadPolling(api, pollInterval, state, dispatch, mounted);
  const { loadMore, isLoadingRead } = useReadNotifications(
    api,
    state,
    dispatch,
  );
  const { markRead, deleteNotification } = useNotificationActions(
    api,
    dispatch,
  );

  const { prefs, togglePref, unsubscribe } = useNotificationPreferences(
    api,
    user,
  );

  const handleOpen = useCallback(
    async (id: string | number) => {
      return api.openNotification({
        id,
        json: 'true',
      });
    },
    [api],
  );

  const bellIcon = (
    <div className={styles.bellIcon}>
      <IconBell size={20} strokeWidth={1.5} />
      {state.unread.length > 0 && (
        <span className={styles.indicator}>{state.unread.length}</span>
      )}
    </div>
  );

  // Render a static bell during SSR to avoid hydration mismatch from
  // Base UI's Popover portal and floating-ui context.
  if (!mounted) {
    return <Button buttonStyle="tab">{bellIcon}</Button>;
  }

  return (
    <Popover.Root>
      <Popover.Trigger render={<Button buttonStyle="tab" />}>
        {bellIcon}
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
                {state.unread.length === 0 && !state.isReadLoaded && (
                  <p className={styles.empty}>No notifications</p>
                )}

                {state.unread.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onDelete={deleteNotification}
                    onMarkRead={markRead}
                    onOpen={handleOpen}
                    onUnsubscribe={unsubscribe}
                  />
                ))}

                {!state.isReadLoaded && state.hasMore && (
                  <button
                    className={styles.showOlder}
                    onClick={loadMore}
                    type="button"
                  >
                    Show older
                  </button>
                )}

                {state.isReadLoaded &&
                  state.read.length === 0 &&
                  state.unread.length === 0 && (
                    <p className={styles.empty}>No notifications</p>
                  )}

                {state.read.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onDelete={deleteNotification}
                    onMarkRead={markRead}
                    onOpen={handleOpen}
                    onUnsubscribe={unsubscribe}
                  />
                ))}

                {state.isReadLoaded && state.hasMoreRead && (
                  <button
                    className={styles.showOlder}
                    disabled={isLoadingRead}
                    onClick={loadMore}
                    type="button"
                  >
                    {isLoadingRead ? 'Loading...' : 'Show more'}
                  </button>
                )}
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

/** Polls unread notifications with `since`-based diffing. */
function useUnreadPolling(
  api: Api,
  pollInterval: number,
  state: NotificationState,
  dispatch: React.Dispatch<NotificationAction>,
  enabled: boolean,
) {
  const timestampRef = useRef(state.pollTimestamp);
  timestampRef.current = state.pollTimestamp;

  const poll = useCallback(async () => {
    try {
      const since = timestampRef.current ?? undefined;
      const { docs, timestamp, hasMore } = await api.unread({
        since,
      });

      if (!timestampRef.current) {
        dispatch({
          type: 'SET_UNREAD',
          docs,
          timestamp,
          hasMore: hasMore ?? false,
        });
      } else {
        dispatch({ type: 'PREPEND_UNREAD', docs, timestamp });
      }
    } catch {
      // Poll will retry on next interval
    }
  }, [api, dispatch]);

  useEffect(() => {
    if (!enabled) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      poll();
      interval = setInterval(poll, pollInterval * 1000);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [poll, pollInterval, enabled]);
}

/** On-demand paginated loading of read notifications. */
function useReadNotifications(
  api: Api,
  state: NotificationState,
  dispatch: React.Dispatch<NotificationAction>,
) {
  const [isLoadingRead, setIsLoadingRead] = useState(false);
  const nextPage = state.readPage + 1;

  const loadMore = useCallback(async () => {
    setIsLoadingRead(true);
    try {
      const { docs, hasNextPage } = await api.read({
        page: nextPage,
        limit: 10,
      });
      dispatch({ type: 'APPEND_READ', docs, hasNextPage });
    } finally {
      setIsLoadingRead(false);
    }
  }, [api, nextPage, dispatch]);

  return { loadMore, isLoadingRead };
}

/** Optimistic mutations dispatched to the reducer. */
function useNotificationActions(
  api: Api,
  dispatch: React.Dispatch<NotificationAction>,
) {
  const markRead = useCallback(
    async (id: string | number) => {
      dispatch({ type: 'MARK_READ', id, readAt: new Date().toISOString() });
      await api.markRead({ id });
    },
    [api, dispatch],
  );

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    await api.markAllRead();
  }, [api, dispatch]);

  const deleteNotification = useCallback(
    async (id: string | number) => {
      dispatch({ type: 'DELETE_NOTIFICATION', id });
      await api.deleteNotification({ id });
    },
    [api, dispatch],
  );

  return { markRead, markAllRead, deleteNotification };
}

/** Reads and toggles user-level notification preferences. */
function useNotificationPreferences(api: Api, user: User | null | undefined) {
  const prefs = user?.notificationPreferences;

  const togglePref = useCallback(
    async (field: keyof Required<User>['notificationPreferences']) => {
      if (!user) return;
      const current = prefs?.[field] ?? true;
      await api.updatePreferences({
        [field]: !current,
      });
    },
    [api, user, prefs],
  );

  const unsubscribe = useCallback(
    async (ref: StoredDocumentReference) => {
      await api.unsubscribe({
        documentReference: toDocumentReference(ref),
      });
    },
    [api],
  );

  return { prefs, togglePref, unsubscribe };
}
