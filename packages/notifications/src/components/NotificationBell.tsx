'use client';

import { DrawerToggler, Pill, useConfig, useDrawerSlug } from '@payloadcms/ui';
import { useCallback, useEffect, useState } from 'react';
import { ENDPOINTS } from '@/procedures';
import styles from './NotificationBell.module.css';
import {
  NOTIFICATIONS_DRAWER_SLUG,
  NotificationDrawer,
} from './NotificationDrawer';

interface NotificationBellProps {
  pollInterval: number;
}

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  const drawerSlug = useDrawerSlug(NOTIFICATIONS_DRAWER_SLUG);
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <>
      <DrawerToggler
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={styles.bellButton}
        slug={drawerSlug}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <Pill pillStyle="dark" size="small">
            {String(unreadCount)}
          </Pill>
        )}
      </DrawerToggler>

      <NotificationDrawer onRead={fetchUnreadCount} />
    </>
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
