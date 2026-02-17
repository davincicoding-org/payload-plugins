'use client';

import {
  ConfirmationModal,
  formatTimeToNow,
  MoreIcon,
  Popup,
  PopupList,
  useModal,
  useTranslation,
} from '@payloadcms/ui';
import { useRouter } from 'next/navigation.js';
import styles from './NotificationItem.module.css';

export interface NotificationData {
  id: string | number;
  event: string;
  actor: { id: string | number; displayName: string };
  subject: string;
  url?: string | null;
  readAt?: string | null;
  collectionSlug?: string | null;
  documentId?: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string | number) => void;
  onUnsubscribe: (documentId: string, collectionSlug: string) => void;
  onDelete: (id: string | number) => void;
  closePanel?: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onUnsubscribe,
  onDelete,
  closePanel,
}: NotificationItemProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const isUnread = !notification.readAt;
  const canUnsubscribe =
    !!notification.collectionSlug && !!notification.documentId;
  const deleteModalSlug = `delete-notification-${notification.id}`;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.url) {
      closePanel?.();
      router.push(notification.url);
    }
  };

  return (
    <div className={styles.row}>
      <Popover.Close
        className={styles.item}
        data-unread={isUnread}
        onClick={handleClick}
        type="button"
      >
        {isUnread && <span className={styles.dot} />}
        <div className={styles.content}>
          <p className={styles.subject}>{notification.subject}</p>
          <span className={styles.meta}>
            <span className={styles.actor}>
              {notification.actor.displayName}
            </span>
            <span className={styles.time}>
              {formatTimeToNow({ date: notification.createdAt, i18n })}
            </span>
          </span>
        </div>
      </button>

      <Popup
        button={<MoreIcon />}
        buttonType="custom"
        className={styles.menu}
        horizontalAlign="right"
        size="small"
      >
        <PopupList.ButtonGroup>
          {isUnread && (
            <PopupList.Button onClick={() => onMarkRead(notification.id)}>
              Mark as read
            </PopupList.Button>
          )}
          {canUnsubscribe && (
            <PopupList.Button
              onClick={() =>
                onUnsubscribe(
                  notification.documentId!,
                  notification.collectionSlug!,
                )
              }
            >
              Unsubscribe
            </PopupList.Button>
          )}
          <PopupList.Divider />
          <PopupList.Button onClick={() => openModal(deleteModalSlug)}>
            Delete
          </PopupList.Button>
        </PopupList.ButtonGroup>
      </Popup>

      <ConfirmationModal
        body="This notification will be permanently deleted."
        heading="Delete notification"
        modalSlug={deleteModalSlug}
        onCancel={() => closeModal(deleteModalSlug)}
        onConfirm={async () => {
          onDelete(notification.id);
          closeModal(deleteModalSlug);
        }}
      />
    </div>
  );
}
