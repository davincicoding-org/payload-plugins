import type { CollectionSlug, Plugin } from 'payload';
import type { NotificationBellProps } from './components/NotificationBell';
import { attachPluginContext } from './context';
import {
  defaultGenerateHTML,
  defaultGenerateSubject,
} from './email/default-email';
import { deleteNotificationEndpoint } from './endpoints/delete-notification';
import { emailUnsubscribeEndpoint } from './endpoints/email-unsubscribe';
import { listNotificationsEndpoint } from './endpoints/list-notifications';
import { markAllReadEndpoint } from './endpoints/mark-all-read';
import { markReadEndpoint } from './endpoints/mark-read';
import { openNotificationEndpoint } from './endpoints/open-notification';
import { unreadCountEndpoint } from './endpoints/unread-count';
import { unsubscribeEndpoint } from './endpoints/unsubscribe';
import { updatePreferencesEndpoint } from './endpoints/update-preferences';
import { Notifications, Subscriptions } from './entities';
import type { NotificationCallback, NotificationEmailConfig } from './types';

export { getSubscribers, notify, subscribe, unsubscribe } from './api';
export { createLiveMessage } from './message';
export type {
  LiveMessage,
  MessageContext,
  MessageFn,
  NotificationEmailLinks,
  NotifyInput,
} from './types';

export interface NotificationsPluginConfig {
  /** Email channel configuration. Pass `true` for default templates, or provide custom functions. */
  email?: true | Partial<NotificationEmailConfig>;
  /** External callback fired for every notification. */
  onNotify?: NotificationCallback;
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

  const resolvedEmail: NotificationEmailConfig | undefined =
    email !== undefined
      ? {
          generateSubject: defaultGenerateSubject,
          generateHTML: defaultGenerateHTML,
          ...(typeof email === 'object' ? email : {}),
        }
      : undefined;

  return (config) => {
    attachPluginContext(config, {
      collectionSlugs: {
        notifications: notifSlug,
        subscriptions: subsSlug,
      },
      pollInterval,
      email: resolvedEmail,
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
        ],
      });
    }

    // Attach Endpoints
    config.endpoints ??= [];
    config.endpoints.push(
      listNotificationsEndpoint(notifSlug),
      markReadEndpoint(notifSlug),
      markAllReadEndpoint(notifSlug),
      unreadCountEndpoint(notifSlug),
      updatePreferencesEndpoint(),
      deleteNotificationEndpoint(notifSlug),
      openNotificationEndpoint(notifSlug),
      unsubscribeEndpoint(),
      emailUnsubscribeEndpoint(),
    );

    // Add admin components
    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      path: 'payload-notifications/client#NotificationBell',
      clientProps: {
        pollInterval,
      } satisfies NotificationBellProps,
    });

    return config;
  };
};
