import type { PayloadRequest, TypeWithID } from 'payload';
import { getPluginContext } from './context';
import {
  createNotificationDoc,
  invokeCallback,
  sendNotificationEmail,
} from './helpers';
import type { NotifyInput } from './types';

export async function notify(
  req: PayloadRequest,
  input: NotifyInput,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  if (!req.payload.config.admin?.user) return;

  const recipient = await req.payload.findByID({
    collection: req.payload.config.admin.user as 'users',
    id: input.recipient,
    depth: 0,
  });

  if (recipient.notificationPreferences?.inAppEnabled) {
    await createNotificationDoc(req, ctx.collectionSlugs.notifications, input);
  }

  if (ctx.email && recipient.notificationPreferences?.emailEnabled) {
    await sendNotificationEmail(req, ctx.email, input, recipient.email);
  }

  if (ctx.onNotify) {
    await invokeCallback(ctx.onNotify, req, input, recipient.email);
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
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
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
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    data: { user: userId as string, documentId, collectionSlug, reason },
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
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
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
): Promise<TypeWithID['id'][]> {
  const ctx = getPluginContext(req.payload.config);

  const results = await req.payload.find({
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    where: {
      and: [
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    limit: 0,
    depth: 0,
  });

  return results.docs.map(({ user }) =>
    typeof user === 'object' ? user.id : user,
  );
}
