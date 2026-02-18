import { defineProcedure } from '@repo/common';
import { z } from 'zod';
import type { NotificationData } from './types';
import { markReadSchema, subscriptionSchema } from './types';

export const ENDPOINTS = {
  listNotifications: defineProcedure({
    path: '/notifications-plugin/list',
    method: 'get',
  }).returns<{ docs: NotificationData[] }>(),

  markRead: defineProcedure({
    path: '/notifications-plugin/mark-read',
    method: 'post',
    input: markReadSchema,
  }).returns<{ success: true }>(),

  markAllRead: defineProcedure({
    path: '/notifications-plugin/mark-all-read',
    method: 'post',
  }).returns<{ success: true }>(),

  unreadCount: defineProcedure({
    path: '/notifications-plugin/unread-count',
    method: 'get',
  }).returns<{ count: number }>(),

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
    input: markReadSchema,
  }).returns<void>(),

  emailUnsubscribe: defineProcedure({
    path: '/notifications-plugin/email-unsubscribe',
    method: 'get',
    input: z.object({ token: z.string() }),
  }).returns<void>(),
};
