'use client';

import { Menu } from '@base-ui/react/menu';
import { formatTimeToNow, useTranslation } from '@payloadcms/ui';
import { IconDotsVertical } from '@tabler/icons-react';
import { ENDPOINTS } from '@/procedures';
import type { NotificationData, StoredDocumentReference } from '@/types';
import styles from './NotificationItem.module.css';

interface NotificationItemProps {
  notification: NotificationData;
  apiRoute: string;
  onMarkRead: (id: string | number) => void;
  onUnsubscribe: (documentReference: StoredDocumentReference) => void;
  onDelete: (id: string | number) => void;
}

export function NotificationItem({
  notification,
  apiRoute,
  onMarkRead,
  onUnsubscribe,
  onDelete,
}: NotificationItemProps) {
  const { i18n } = useTranslation();
  const isUnread = !notification.readAt;

  const handleClick = async () => {
    const { url } = await ENDPOINTS.openNotification.call(apiRoute, {
      id: notification.id,
      json: 'true',
    });

    if (url) {
      window.location.href = url;
      return;
    }

    // No target — just update local state since the server already marked it read
    if (isUnread) onMarkRead(notification.id);
  };

  return (
    <div className={styles.row}>
      <button
        className={styles.item}
        data-unread={isUnread}
        onClick={handleClick}
        type="button"
      >
        {isUnread && <span className={styles.dot} />}
        <div className={styles.content}>
          <p className={styles.message}>{notification.message}</p>
          <span className={styles.time}>
            {formatTimeToNow({ date: notification.createdAt, i18n })}
          </span>
        </div>
      </button>

      <Menu.Root>
        <Menu.Trigger className={styles.menuTrigger}>
          <IconDotsVertical size={14} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="end" sideOffset={4}>
            <Menu.Popup className={styles.menuPopup}>
              {isUnread && (
                <Menu.Item
                  className={styles.menuItem}
                  onClick={() => onMarkRead(notification.id)}
                >
                  Mark as read
                </Menu.Item>
              )}
              {notification.documentReference && (
                <Menu.Item
                  className={styles.menuItem}
                  onClick={() => onUnsubscribe(notification.documentReference)}
                >
                  Unsubscribe
                </Menu.Item>
              )}
              <Menu.Separator className={styles.menuSeparator} />
              <Menu.Item
                className={styles.menuItem}
                data-variant="danger"
                onClick={() => onDelete(notification.id)}
              >
                Delete
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
