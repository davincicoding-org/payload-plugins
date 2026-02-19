import { defineProcedure } from '@davincicoding/payload-plugin-kit';
import { z } from 'zod';
import type { NotificationData } from './types';
import { markReadSchema, subscriptionSchema } from './types';

export const ENDPOINTS = {
  unread: defineProcedure({
    path: '/notifications-plugin/unread',
    method: 'get',
    input: z.object({ since: z.string().datetime().optional() }),
  }).returns<{
    docs: NotificationData[];
    timestamp: string;
    hasMore?: boolean;
  }>(),

  read: defineProcedure({
    path: '/notifications-plugin/read',
    method: 'get',
    input: z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
    }),
  }).returns<{
    docs: NotificationData[];
    hasNextPage: boolean;
    totalDocs: number;
  }>(),

  markRead: defineProcedure({
    path: '/notifications-plugin/mark-read',
    method: 'post',
    input: markReadSchema,
  }).returns<{ success: true }>(),

  markAllRead: defineProcedure({
    path: '/notifications-plugin/mark-all-read',
    method: 'post',
  }).returns<{ success: true }>(),

  updatePreferences: defineProcedure({
    path: '/notifications-plugin/preferences',
    method: 'post',
    input: z.object({ emailEnabled: z.boolean() }),
  }).returns<{ success: true }>(),

  unsubscribe: defineProcedure({
    path: '/notifications-plugin/unsubscribe',
    method: 'post',
    input: subscriptionSchema,
  }).returns<{ success: true }>(),

  deleteNotification: defineProcedure({
    path: '/notifications-plugin/delete',
    method: 'post',
    input: markReadSchema,
  }).returns<{ success: true }>(),

  openNotification: defineProcedure({
    path: '/notifications-plugin/open',
    method: 'get',
    input: markReadSchema.extend({ json: z.literal('true').optional() }),
  }).returns<{ url: string | null }>(),

  emailUnsubscribe: defineProcedure({
    path: '/notifications-plugin/email-unsubscribe',
    method: 'get',
    input: z.object({ token: z.string() }),
  }).returns<void>(),
};
