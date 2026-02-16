import type { CollectionSlug, Endpoint, PayloadRequest, Plugin } from 'payload';
import { Notifications } from './collections/notifications';
import { Subscriptions } from './collections/subscriptions';
import type { NotificationsConfig, NotifyInput } from './types';
import { notifyInputSchema } from './types';

export type {
  NotificationEmailConfig,
  NotificationsConfig,
  NotifyInput,
} from './types';
export { notifyInputSchema } from './types';

export interface NotificationsAPI {
  plugin: () => Plugin;
  notify: (req: PayloadRequest, input: NotifyInput) => Promise<void>;
  subscribe: (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
    reason?: 'manual' | 'auto',
  ) => Promise<void>;
  unsubscribe: (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
  ) => Promise<void>;
  getSubscribers: (
    req: PayloadRequest,
    documentId: string,
    collectionSlug: string,
  ) => Promise<(string | number)[]>;
}

/**
 * Creates a notifications system with in-app, email, and callback channels.
 *
 * Returns an API handle with `.plugin()` for the Payload plugins array,
 * plus `.notify()`, `.subscribe()`, `.unsubscribe()`, and `.getSubscribers()`.
 */
export const createNotifications = (
  config: NotificationsConfig = {},
): NotificationsAPI => {
  const {
    notificationsSlug = 'notifications',
    subscriptionsSlug = 'subscriptions',
    pollInterval = 30,
    email,
    onNotify,
  } = config;

  const notifSlug = notificationsSlug as CollectionSlug;
  const subsSlug = subscriptionsSlug as CollectionSlug;

  const plugin = (): Plugin => (payloadConfig) => {
    payloadConfig.collections ??= [];
    payloadConfig.collections.push(Notifications({ slug: notifSlug }));
    payloadConfig.collections.push(Subscriptions({ slug: subsSlug }));

    addNotificationPreferences(payloadConfig);
    registerEndpoints(payloadConfig, notifSlug, subsSlug);
    registerBellComponent(payloadConfig, pollInterval);

    return payloadConfig;
  };

  const notify = async (
    req: PayloadRequest,
    input: NotifyInput,
  ): Promise<void> => {
    const parsed = notifyInputSchema.parse(input);
    const userSlug = (req.payload.config.admin?.user ??
      'users') as CollectionSlug;

    const recipient = await req.payload.findByID({
      collection: userSlug,
      id: parsed.recipient,
      depth: 0,
    });

    const prefs = (recipient as Record<string, unknown>)
      .notificationPreferences as
      | { emailEnabled?: boolean; inAppEnabled?: boolean }
      | undefined;

    const isEmailEnabled = prefs?.emailEnabled !== false;
    const isInAppEnabled = prefs?.inAppEnabled !== false;
    const recipientEmail = (recipient as Record<string, unknown>)
      .email as string;

    if (isInAppEnabled) {
      await createNotificationDoc(req, notifSlug, parsed);
    }

    if (email && isEmailEnabled && recipientEmail) {
      await sendNotificationEmail(req, email, parsed, recipientEmail);
    }

    if (onNotify) {
      await invokeCallback(onNotify, req, parsed, recipientEmail);
    }
  };

  const subscribe = async (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
    reason: 'manual' | 'auto' = 'auto',
  ): Promise<void> => {
    const existing = await req.payload.find({
      collection: subsSlug,
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

    await (req.payload.create as LooseCreateFn)({
      collection: subsSlug,
      data: { user: userId, documentId, collectionSlug, reason },
      req,
    });
  };

  const unsubscribe = async (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
  ): Promise<void> => {
    await req.payload.delete({
      collection: subsSlug,
      where: {
        and: [
          { user: { equals: userId } },
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      req,
    });
  };

  const getSubscribers = async (
    req: PayloadRequest,
    documentId: string,
    collectionSlug: string,
  ): Promise<(string | number)[]> => {
    const results = await req.payload.find({
      collection: subsSlug,
      where: {
        and: [
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      limit: 0,
      depth: 0,
    });

    return results.docs.map((doc) => doc.user as string | number);
  };

  return { plugin, notify, subscribe, unsubscribe, getSubscribers };
};

// Payload's local API is strictly typed against generated collection types.
// Plugins work with dynamic slugs unknown at compile time, so we use
// wider signatures for create/update calls.
type LooseCreateFn = (args: {
  collection: CollectionSlug;
  data: Record<string, unknown>;
  req?: PayloadRequest;
}) => Promise<unknown>;

type LooseUpdateFn = (args: {
  collection: CollectionSlug;
  data: Record<string, unknown>;
  id?: string | number;
  where?: Record<string, unknown>;
  req?: PayloadRequest;
}) => Promise<unknown>;

// --- Plugin setup helpers ---

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

function registerEndpoints(
  payloadConfig: Parameters<Plugin>[0],
  notifSlug: CollectionSlug,
  subsSlug: CollectionSlug,
): void {
  payloadConfig.endpoints ??= [];
  payloadConfig.endpoints.push(
    markReadEndpoint(notifSlug),
    markAllReadEndpoint(notifSlug),
    unreadCountEndpoint(notifSlug),
    subscribeEndpoint(subsSlug),
    unsubscribeEndpoint(subsSlug),
  );
}

function registerBellComponent(
  payloadConfig: Parameters<Plugin>[0],
  pollInterval: number,
): void {
  payloadConfig.admin ??= {};
  payloadConfig.admin.components ??= {};

  const afterNavLinks = payloadConfig.admin.components.afterNavLinks ?? [];
  afterNavLinks.push({
    path: 'payload-notifications/client#NotificationBell',
    clientProps: { pollInterval },
  });
  payloadConfig.admin.components.afterNavLinks = afterNavLinks;
}

// --- Notify helpers ---

async function createNotificationDoc(
  req: PayloadRequest,
  notifSlug: CollectionSlug,
  parsed: NotifyInput,
): Promise<void> {
  await (req.payload.create as LooseCreateFn)({
    collection: notifSlug,
    data: {
      recipient: parsed.recipient,
      event: parsed.event,
      actor: { id: parsed.actor.id, displayName: parsed.actor.displayName },
      subject: parsed.subject,
      url: parsed.url ?? null,
      meta: parsed.meta ?? null,
    },
    req,
  });
}

async function sendNotificationEmail(
  req: PayloadRequest,
  emailConfig: NonNullable<NotificationsConfig['email']>,
  parsed: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({
        notification: parsed,
        recipient: { id: parsed.recipient, email: recipientEmail },
      }),
      emailConfig.generateSubject({
        notification: parsed,
        recipient: { id: parsed.recipient, email: recipientEmail },
      }),
    ]);
    await req.payload.sendEmail({ to: recipientEmail, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}

async function invokeCallback(
  onNotify: NonNullable<NotificationsConfig['onNotify']>,
  req: PayloadRequest,
  parsed: NotifyInput,
  recipientEmail: string,
): Promise<void> {
  try {
    await onNotify({
      req,
      notification: parsed,
      recipient: { id: parsed.recipient, email: recipientEmail },
    });
  } catch (err) {
    console.error('[payload-notifications] onNotify callback failed:', err);
  }
}

// --- Endpoint handlers ---

function markReadEndpoint(notifSlug: CollectionSlug): Endpoint {
  return {
    path: '/notifications-plugin/mark-read',
    method: 'post',
    handler: async (req: PayloadRequest) => {
      if (!req.user)
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { id } = req.data as { id: string | number };
      await (req.payload.update as LooseUpdateFn)({
        collection: notifSlug,
        id,
        data: { readAt: new Date().toISOString() },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function markAllReadEndpoint(notifSlug: CollectionSlug): Endpoint {
  return {
    path: '/notifications-plugin/mark-all-read',
    method: 'post',
    handler: async (req: PayloadRequest) => {
      if (!req.user)
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      await (req.payload.update as LooseUpdateFn)({
        collection: notifSlug,
        where: {
          and: [
            { recipient: { equals: req.user.id } },
            { readAt: { exists: false } },
          ],
        },
        data: { readAt: new Date().toISOString() },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function unreadCountEndpoint(notifSlug: CollectionSlug): Endpoint {
  return {
    path: '/notifications-plugin/unread-count',
    method: 'get',
    handler: async (req: PayloadRequest) => {
      if (!req.user)
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const result = await req.payload.count({
        collection: notifSlug,
        where: {
          and: [
            { recipient: { equals: req.user.id } },
            { readAt: { exists: false } },
          ],
        },
      });
      return Response.json({ count: result.totalDocs });
    },
  };
}

function subscribeEndpoint(subsSlug: CollectionSlug): Endpoint {
  return {
    path: '/notifications-plugin/subscribe',
    method: 'post',
    handler: async (req: PayloadRequest) => {
      if (!req.user)
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { documentId, collectionSlug } = req.data as {
        documentId: string;
        collectionSlug: string;
      };

      const existing = await req.payload.find({
        collection: subsSlug,
        where: {
          and: [
            { user: { equals: req.user.id } },
            { documentId: { equals: documentId } },
            { collectionSlug: { equals: collectionSlug } },
          ],
        },
        limit: 1,
      });

      if (existing.totalDocs > 0) {
        return Response.json({ success: true, alreadySubscribed: true });
      }

      await (req.payload.create as LooseCreateFn)({
        collection: subsSlug,
        data: {
          user: req.user.id,
          documentId,
          collectionSlug,
          reason: 'manual',
        },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function unsubscribeEndpoint(subsSlug: CollectionSlug): Endpoint {
  return {
    path: '/notifications-plugin/unsubscribe',
    method: 'post',
    handler: async (req: PayloadRequest) => {
      if (!req.user)
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { documentId, collectionSlug } = req.data as {
        documentId: string;
        collectionSlug: string;
      };
      await req.payload.delete({
        collection: subsSlug,
        where: {
          and: [
            { user: { equals: req.user.id } },
            { documentId: { equals: documentId } },
            { collectionSlug: { equals: collectionSlug } },
          ],
        },
        req,
      });
      return Response.json({ success: true });
    },
  };
}
