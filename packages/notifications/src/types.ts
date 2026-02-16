import { entityIdSchema } from '@repo/common';
import type { PayloadRequest } from 'payload';
import { z } from 'zod';

// --- Endpoint input schemas ---

export const markReadSchema = z.object({
  id: entityIdSchema,
});

export const subscriptionSchema = z.object({
  documentId: z.string(),
  collectionSlug: z.string(),
});

// --- Notification input ---

export const notifyInputSchema = z.object({
  recipient: z.union([z.string(), z.number()]),
  event: z.string(),
  actor: z.object({
    id: z.union([z.string(), z.number()]),
    displayName: z.string(),
  }),
  subject: z.string(),
  url: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type NotifyInput = z.infer<typeof notifyInputSchema>;

export interface NotificationEmailConfig {
  generateHTML: (args: {
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => string | Promise<string>;
  generateSubject: (args: {
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => string | Promise<string>;
}

export interface NotificationsConfig {
  /** Email channel configuration. If omitted, email delivery is skipped. */
  email?: NotificationEmailConfig;
  /** External callback fired for every notification. */
  onNotify?: (args: {
    req: PayloadRequest;
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => void | Promise<void>;
  /** Slug for the notifications collection. @default "notifications" */
  notificationsSlug?: string;
  /** Slug for the subscriptions collection. @default "subscriptions" */
  subscriptionsSlug?: string;
  /** Poll interval in seconds for the bell icon. @default 30 */
  pollInterval?: number;
}
