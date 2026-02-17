import type { CollectionSlug, Plugin } from 'payload';
import { attachPluginContext } from './context';
import { deleteNotificationEndpoint } from './endpoints/delete-notification';
import { markAllReadEndpoint } from './endpoints/mark-all-read';
import { markReadEndpoint } from './endpoints/mark-read';
import { subscribeEndpoint } from './endpoints/subscribe';
import { unreadCountEndpoint } from './endpoints/unread-count';
import { unsubscribeEndpoint } from './endpoints/unsubscribe';
import { Notifications, Subscriptions } from './entities';

import type { NotifactionCallback, NotificationEmailConfig } from './types';

export { getSubscribers, notify, subscribe, unsubscribe } from './api';
export type { LiveSubject } from './subject';
export { createLiveSubject } from './subject';
export type { NotifyInput, SubjectContext, SubjectFn } from './types';

export interface NotificationsPluginConfig {
  /** Email channel configuration. If omitted, email delivery is skipped. */
  email?: NotificationEmailConfig;
  /** External callback fired for every notification. */
  onNotify?: NotifactionCallback;
  /** Slug for the notifications collection. @default "notifications" */
  notificationsSlug?: string;
  /** Slug for the subscriptions collection. @default "subscriptions" */
  subscriptionsSlug?: string;
  /** Poll interval in seconds for the bell icon. @default 30 */
  pollInterval?: number;
}

export const notificationsPlugin = ({
  notificationsSlug = 'notifications',
  subscriptionsSlug = 'subscriptions',
  pollInterval = 30,
  email,
  onNotify,
}: NotificationsPluginConfig = {}): Plugin => {
  const notifSlug = notificationsSlug as CollectionSlug;
  const subsSlug = subscriptionsSlug as CollectionSlug;

  return (config) => {
    attachPluginContext(config, {
      collectionSlugs: {
        notifications: notifSlug,
        subscriptions: subsSlug,
      },
      pollInterval,
      email,
      onNotify,
    });

    // Add Collections
    config.collections ??= [];
    config.collections.push(Notifications({ slug: notifSlug }));
    config.collections.push(Subscriptions({ slug: subsSlug }));

    // Add Notification Preferences
    const usersCollection = config.collections.find(
      ({ slug }) => slug === config.admin?.user,
    );

    if (usersCollection) {
      usersCollection.fields ??= [];
      usersCollection.fields.push({
        name: 'notificationPreferences',
        type: 'group',
        fields: [
          {
            name: 'emailEnabled',
            type: 'checkbox',
            defaultValue: true,
            label: 'Email notifications',
          },
          {
            name: 'inAppEnabled',
            type: 'checkbox',
            defaultValue: true,
            label: 'In-app notifications',
          },
        ],
      });
    }

    // Attach Endpoints
    config.endpoints ??= [];
    config.endpoints.push(
      markReadEndpoint(notifSlug),
      markAllReadEndpoint(notifSlug),
      unreadCountEndpoint(notifSlug),
      deleteNotificationEndpoint(notifSlug),
      subscribeEndpoint(subsSlug),
      unsubscribeEndpoint(subsSlug),
    );

    // Add admin components
    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      path: 'payload-notifications/client#NotificationBell',
      clientProps: { pollInterval },
    });

    return config;
  };
};
