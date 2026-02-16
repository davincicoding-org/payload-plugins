import type { PayloadRequest, Plugin } from 'payload';
import { attachPluginContext, getPluginContext } from './context';
import { markAllReadEndpoint } from './endpoints/mark-all-read';
import { markReadEndpoint } from './endpoints/mark-read';
import { subscribeEndpoint } from './endpoints/subscribe';
import { unreadCountEndpoint } from './endpoints/unread-count';
import { unsubscribeEndpoint } from './endpoints/unsubscribe';
import { Notifications, Subscriptions } from './entities';
import {
  createNotificationDoc,
  invokeCallback,
  sendNotificationEmail,
} from './helpers';
import type { NotificationsConfig, NotifyInput } from './types';
import { notifyInputSchema } from './types';

export type {
  NotificationEmailConfig,
  NotificationsConfig,
  NotifyInput,
} from './types';
export { notifyInputSchema } from './types';

// --- Plugin ---

export const notificationsPlugin =
  ({
    notificationsSlug = 'notifications',
    subscriptionsSlug = 'subscriptions',
    pollInterval = 30,
    email,
    onNotify,
  }: NotificationsConfig = {}): Plugin =>
  (config) => {
    attachPluginContext(config, {
      notificationsSlug,
      subscriptionsSlug,
      pollInterval,
      email,
      onNotify,
    });

    config.collections ??= [];
    config.collections.push(Notifications({ slug: notificationsSlug }));
    config.collections.push(Subscriptions({ slug: subscriptionsSlug }));

    addNotificationPreferences(config);

    config.endpoints ??= [];
    config.endpoints.push(
      markReadEndpoint(notificationsSlug),
      markAllReadEndpoint(notificationsSlug),
      unreadCountEndpoint(notificationsSlug),
      subscribeEndpoint(subscriptionsSlug),
      unsubscribeEndpoint(subscriptionsSlug),
    );

    config.admin ??= {};
    config.admin.components ??= {};
    const afterNavLinks = config.admin.components.afterNavLinks ?? [];
    afterNavLinks.push({
      path: 'payload-notifications/client#NotificationBell',
      clientProps: { pollInterval },
    });
    config.admin.components.afterNavLinks = afterNavLinks;

    return config;
  };

// --- Standalone API functions ---

export async function notify(
  req: PayloadRequest,
  input: NotifyInput,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  const parsed = notifyInputSchema.parse(input);
  const userSlug = req.payload.config.admin?.user ?? 'users';

  const recipient = await req.payload.findByID({
    collection: userSlug,
    id: parsed.recipient,
    depth: 0,
  });

  const prefs = recipient.notificationPreferences as
    | { emailEnabled?: boolean; inAppEnabled?: boolean }
    | undefined;

  const isEmailEnabled = prefs?.emailEnabled !== false;
  const isInAppEnabled = prefs?.inAppEnabled !== false;
  const recipientEmail = recipient.email as string;

  if (isInAppEnabled) {
    await createNotificationDoc(req, ctx.notificationsSlug, parsed);
  }

  if (ctx.email && isEmailEnabled && recipientEmail) {
    await sendNotificationEmail(req, ctx.email, parsed, recipientEmail);
  }

  if (ctx.onNotify) {
    await invokeCallback(ctx.onNotify, req, parsed, recipientEmail);
  }
}

export async function subscribe(
  req: PayloadRequest,
  userId: string | number,
  documentId: string,
  collectionSlug: string,
  reason: 'manual' | 'auto' = 'auto',
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);

  const existing = await req.payload.find({
    collection: ctx.subscriptionsSlug,
    where: {
      and: [
        { user: { equals: userId } },
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    limit: 1,
  });

  if (existing.totalDocs > 0) return;

  await req.payload.create({
    collection: ctx.subscriptionsSlug,
    data: { user: userId, documentId, collectionSlug, reason },
    req,
  });
}

export async function unsubscribe(
  req: PayloadRequest,
  userId: string | number,
  documentId: string,
  collectionSlug: string,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);

  await req.payload.delete({
    collection: ctx.subscriptionsSlug,
    where: {
      and: [
        { user: { equals: userId } },
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    req,
  });
}

export async function getSubscribers(
  req: PayloadRequest,
  documentId: string,
  collectionSlug: string,
): Promise<(string | number)[]> {
  const ctx = getPluginContext(req.payload.config);

  const results = await req.payload.find({
    collection: ctx.subscriptionsSlug,
    where: {
      and: [
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    limit: 0,
    depth: 0,
  });

  return results.docs.map(
    (doc) =>
      (doc as unknown as Record<string, unknown>).user as string | number,
  );
}

// --- Internal helpers ---

function addNotificationPreferences(
  payloadConfig: Parameters<Plugin>[0],
): void {
  const usersCollection = payloadConfig.collections?.find(
    (c) => c.slug === payloadConfig.admin?.user,
  );
  if (!usersCollection) return;

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
