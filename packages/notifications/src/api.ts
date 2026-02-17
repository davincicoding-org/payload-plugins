import { type DocumentReference, fetchDocumentByReference } from '@repo/common';
import type { PayloadRequest, TypeWithID, Where } from 'payload';
import { getPluginContext } from './context';
import {
  createNotificationDoc,
  invokeCallback,
  sendNotificationEmail,
} from './helpers';
import { resolveActor } from './resolve-actor';
import { resolveSubjectAtReadTime, toStoredSubject } from './resolve-subject';
import type {
  NotifyInput,
  StoredDocumentReference,
  SubjectContext,
} from './types';

/** Convert a DocumentReference to the flat shape stored in the group field. */
function toStoredReference(ref: DocumentReference): StoredDocumentReference {
  return {
    entity: ref.entity,
    slug: ref.slug,
    documentId: ref.entity === 'collection' ? String(ref.id) : undefined,
  };
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

export async function notify(
  req: PayloadRequest,
  input: NotifyInput,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  if (!req.payload.config.admin?.user) return;

  // Resolve actor display name if provided
  const actor = input.actor
    ? await resolveActor(req.payload, input.actor)
    : undefined;

  // Fetch the referenced document if provided
  const document = input.documentReference
    ? await fetchDocumentByReference(req.payload, input.documentReference)
    : undefined;

  // Build subject context from resolved data
  const subjectContext: SubjectContext = {
    actor,
    document: document as Record<string, unknown> | undefined,
    meta: input.meta,
  };

  // Convert subject to stored format and resolve a plain string for email/callback
  const storedSubject = toStoredSubject(input.subject, subjectContext);
  const resolvedSubjectString = resolveSubjectAtReadTime(
    storedSubject,
    subjectContext,
  );

  // Convert documentReference to stored format
  const storedRef = input.documentReference
    ? toStoredReference(input.documentReference)
    : undefined;

  const recipient = await req.payload.findByID({
    collection: req.payload.config.admin.user as 'users',
    id: input.recipient,
    depth: 0,
  });

  if (recipient.notificationPreferences?.inAppEnabled) {
    await createNotificationDoc(req, ctx.collectionSlugs.notifications, {
      recipient: String(input.recipient),
      event: input.event,
      actor: actor ? String(actor.id) : undefined,
      subject: storedSubject,
      url: input.url,
      meta: input.meta,
      documentReference: storedRef,
    });
  }

  const emailNotification = {
    subject: resolvedSubjectString,
    recipient: String(input.recipient),
    event: input.event,
  };

  if (ctx.email && recipient.notificationPreferences?.emailEnabled) {
    await sendNotificationEmail(
      req,
      ctx.email,
      emailNotification,
      recipient.email,
    );
  }

  if (ctx.onNotify) {
    await invokeCallback(ctx.onNotify, req, emailNotification, recipient.email);
  }
}

export async function subscribe(
  req: PayloadRequest,
  {
    userId,
    documentReference,
    reason = 'auto',
  }: {
    userId: string | number;
    documentReference: DocumentReference;
    reason: 'manual' | 'auto';
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
      reason,
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
