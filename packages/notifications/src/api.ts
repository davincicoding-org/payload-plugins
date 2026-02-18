import {
  type DocumentID,
  type DocumentReference,
  fetchDocumentByReference,
} from '@repo/common';
import type { PayloadRequest, TypeWithID, Where } from 'payload';
import { getPluginContext } from './context';
import { sendNotificationEmail } from './email';
import { resolveUser, toStoredReference } from './helpers';
import { resolveMessageAtReadTime, toMessage } from './message';
import type {
  MessageContext,
  NotifyInput,
  ResolvedActor,
  StoredDocumentReference,
} from './types';

export async function notify<Actor extends DocumentID | null>(
  req: PayloadRequest,
  input: NotifyInput<Actor>,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  if (!req.payload.config.admin?.user) return;

  // Resolve actor display name if provided
  const actor = input.actor
    ? await resolveUser(req.payload, input.actor)
    : null;

  // Fetch the referenced document if provided
  const document = input.documentReference
    ? await fetchDocumentByReference(req.payload, input.documentReference)
    : undefined;

  // Build message context from resolved data
  const messageContext: MessageContext<Actor> = {
    actor: actor as Actor extends DocumentID ? ResolvedActor : null,
    document: document as Record<string, unknown> | undefined,
    meta: input.meta,
  };

  // Convert message to stored format and resolve a plain string for email/callback
  const serializedMessage = toMessage(input.message, messageContext);
  const resolvedMessageString = resolveMessageAtReadTime(
    serializedMessage,
    messageContext,
  );

  const recipient = await resolveUser(req.payload, input.recipient);

  const notificationDoc = await req.payload.create({
    collection: ctx.collectionSlugs.notifications as 'notifications',
    data: {
      recipient: input.recipient as string,
      event: input.event,
      actor: input.actor as string,
      message: serializedMessage,
      url: input.url,
      meta: input.meta,
      documentReference: input.documentReference,
    },
    req,
  });

  if (ctx.email && recipient.notificationPreferences?.emailEnabled) {
    await sendNotificationEmail(req, {
      emailConfig: ctx.email,
      notification: {
        message: resolvedMessageString,
        event: input.event,
      },
      recipient,
      notificationId: notificationDoc.id,
      documentReference: input.documentReference,
    });
  }

  if (ctx.onNotify) {
    try {
      await ctx.onNotify({
        req,
        notification: {
          message: resolvedMessageString,
          event: input.event,
        },
        recipient,
      });
    } catch (err) {
      console.error('[payload-notifications] onNotify callback failed:', err);
    }
  }
}

export async function subscribe(
  req: PayloadRequest,
  {
    userId,
    documentReference,
  }: {
    userId: string | number;
    documentReference: DocumentReference;
  },
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  const ref = toStoredReference(documentReference);

  const existing = await req.payload.find({
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    where: {
      and: [{ user: { equals: userId } }, ...documentReferenceWhere(ref)],
    },
    limit: 1,
  });

  if (existing.totalDocs > 0) return;

  await req.payload.create({
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    data: {
      user: userId as string,
      documentReference: ref,
    },
    req,
  });
}

export async function unsubscribe(
  req: PayloadRequest,
  userId: string | number,
  documentReference: DocumentReference,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  const ref = toStoredReference(documentReference);

  await req.payload.delete({
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    where: {
      and: [{ user: { equals: userId } }, ...documentReferenceWhere(ref)],
    },
    req,
  });
}

export async function getSubscribers(
  req: PayloadRequest,
  documentReference: DocumentReference,
): Promise<TypeWithID['id'][]> {
  const ctx = getPluginContext(req.payload.config);
  const ref = toStoredReference(documentReference);

  const results = await req.payload.find({
    collection: ctx.collectionSlugs.subscriptions as 'subscriptions',
    where: {
      and: documentReferenceWhere(ref),
    },
    limit: 0,
    depth: 0,
  });

  return results.docs.map(({ user }) =>
    typeof user === 'object' ? user.id : user,
  );
}

/** Build the where clause to match a stored document reference. */
function documentReferenceWhere(ref: StoredDocumentReference): Where[] {
  const conditions: Where[] = [
    { 'documentReference.entity': { equals: ref.entity } },
    { 'documentReference.slug': { equals: ref.slug } },
  ];
  if (ref.documentId) {
    conditions.push({
      'documentReference.documentId': { equals: ref.documentId },
    });
  }
  return conditions;
}
