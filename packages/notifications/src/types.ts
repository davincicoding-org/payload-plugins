import {
  type DocumentID,
  type DocumentReference,
  documentIdSchema,
  documentReferenceSchema,
} from '@repo/common';
import type { PayloadRequest } from 'payload';
import { z } from 'zod';
import type { User } from './payload-types';

export interface ResolvedUser extends User {
  displayName: string;
}

// ── Notification types ─────────────────────────────────────────────────

export interface NotificationEmailConfig {
  generateSubject: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  }) => string | Promise<string>;
  generateHTML: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  }) => string | Promise<string>;
}

export type NotifactionCallback = (args: {
  req: PayloadRequest;
  notification: MinimalNotification;
  recipient: ResolvedUser;
}) => void | Promise<void>;

export interface NotifyInput {
  recipient: DocumentID;
  event: string;
  actor?: DocumentID;
  message: string | MessageFn | LiveMessage;
  url?: string;
  meta?: Record<string, unknown>;
  documentReference?: DocumentReference;
}

export interface MinimalNotification {
  message: string;
  event: string;
}

export interface NotificationEmailLinks {
  /** Marks notification as read and redirects to its target. Requires login. */
  openURL: string;
  /** Unsubscribes the user from this notification source. No login required. */
  unsubscribeURL: string | undefined;
}

// ── Message schemas & types ────────────────────────────────────────────

const staticMessageSchema = z.object({
  type: z.literal('static'),
  value: z.string(),
});

const liveMessageTokenSchema = z.object({
  type: z.enum(['actor', 'document', 'meta']),
  field: z.string(),
});

const liveMessageSchema = z.object({
  type: z.literal('live'),
  parts: z.array(z.union([z.string(), liveMessageTokenSchema])),
});

export const messageSchema = z.discriminatedUnion('type', [
  staticMessageSchema,
  liveMessageSchema,
]);

export type LiveMessageToken = z.infer<typeof liveMessageTokenSchema>;

export type LiveMessage = Readonly<z.infer<typeof liveMessageSchema>>;

/** Context passed to a `MessageFn` when resolving the notification message. */
export interface MessageContext {
  actor?: { id: string | number; displayName: string };
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/** A function that receives context and returns a resolved message string. */
export type MessageFn = (ctx: MessageContext) => string;

// ── Endpoint schemas ───────────────────────────────────────────────────

export const markReadSchema = z.object({
  id: documentIdSchema,
});

/** The flat shape stored in the Subscriptions group field. */
export interface StoredDocumentReference {
  entity: 'collection' | 'global';
  slug: string;
  documentId?: string;
}

export const subscriptionSchema = z.object({
  documentReference: documentReferenceSchema,
});
