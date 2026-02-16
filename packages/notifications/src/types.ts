import { entityIdSchema } from '@repo/common';
import type { PayloadRequest, TypeWithID } from 'payload';
import { z } from 'zod';
import type { User } from './payload-types';

/**
 * The fields a caller passes to `notify()`.
 *
 * Mirrors the Notification document shape but uses plain IDs
 * (the caller passes IDs, not populated relationships).
 */
export interface NotifyInput {
  recipient: TypeWithID['id'];
  event: string;
  // TODO derive displayName from config
  actor: TypeWithID & { displayName: string };
  subject: string;
  url?: string;
  meta?: Record<string, unknown>;
}

export interface NotificationEmailConfig {
  generateHTML: (args: {
    notification: NotifyInput;
    recipient: Pick<User, 'id' | 'email'>;
  }) => string | Promise<string>;
  generateSubject: (args: {
    notification: NotifyInput;
    recipient: Pick<User, 'id' | 'email'>;
  }) => string | Promise<string>;
}

export type NotifactionCallback = (args: {
  req: PayloadRequest;
  notification: NotifyInput;
  recipient: Pick<User, 'id' | 'email'>;
}) => void | Promise<void>;

// Endpoint Input Schemas

export const markReadSchema = z.object({
  id: entityIdSchema,
});

export const subscriptionSchema = z.object({
  documentId: z.string(),
  collectionSlug: z.string(),
});
