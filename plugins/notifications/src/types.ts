import {
  type DocumentID,
  type DocumentReference,
  documentIdSchema,
  documentReferenceSchema,
} from '@davincicoding/payload-plugin-kit';
import type { CollectionSlug, PayloadRequest } from 'payload';
import { z } from 'zod';
import type { NotificationsPluginConfig } from '.';
import type { User } from './payload-types';

export type ResolvedPluginOptions<
  K extends keyof NotificationsPluginConfig = keyof NotificationsPluginConfig,
> = Pick<Required<NotificationsPluginConfig>, K>;

export interface ResolvedUser extends User {
  displayName: string;
}

// ── Notification types ─────────────────────────────────────────────────

export interface NotificationPluginContext {
  collectionSlugs: Record<'notifications' | 'subscriptions', CollectionSlug>;
  pollInterval: number;
  email: NotificationEmailConfig | undefined;
  onNotify: NotificationCallback | undefined;
}

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

export type NotificationCallback = (args: {
  req: PayloadRequest;
  notification: MinimalNotification;
  recipient: ResolvedUser;
}) => void | Promise<void>;

export interface NotifyInput<Actor extends DocumentID | null> {
  recipient: DocumentID;
  event: string;
  actor: Actor;
  message: string | MessageFn<Actor> | LiveMessage;
  url?: string;
  meta?: Record<string, unknown>;
  documentReference?: DocumentReference;
}

export interface MinimalNotification {
  message: string;
  event: string;
}

export interface NotificationData {
  id: string | number;
  event: string;
  /** Pre-resolved message string for display. */
  message: string;
  readAt?: string | null;
  documentReference: StoredDocumentReference;
  createdAt: string;
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

/** Resolved actor data available inside a {@link MessageFn}. */
export interface ResolvedActor {
  id: string | number;
  displayName: string;
}

/** Context passed to a `MessageFn` when resolving the notification message. */
export interface MessageContext<Actor extends DocumentID | null> {
  actor: Actor extends DocumentID ? ResolvedActor : null;
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/** A function that receives context and returns a resolved message string. */
export type MessageFn<Actor extends DocumentID | null> = (
  ctx: MessageContext<Actor>,
) => string;

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
