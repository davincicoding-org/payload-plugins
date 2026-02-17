import {
  type DocumentReference,
  documentIdSchema,
  documentReferenceSchema,
} from '@repo/common';
import type { PayloadRequest, TypeWithID } from 'payload';
import { z } from 'zod';
import type { User } from './payload-types';
import type { LiveSubject } from './subject';

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

/** Context passed to a `SubjectFn` when resolving the subject string. */
export interface SubjectContext {
  actor?: { id: string | number; displayName: string };
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

/** A function that receives context and returns a resolved subject string. */
export type SubjectFn = (ctx: SubjectContext) => string;

export interface NotifyInput {
  recipient: TypeWithID['id'];
  event: string;
  actor?: TypeWithID['id'];
  subject: string | SubjectFn | LiveSubject;
  url?: string;
  meta?: Record<string, unknown>;
  documentReference?: DocumentReference;
}

// Endpoint Input Schemas

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
