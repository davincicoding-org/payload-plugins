import { defineProcedure } from '@repo/common';
import { markReadSchema, subscriptionSchema } from './types';

export const ENDPOINTS = {
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

  subscribe: defineProcedure({
    path: '/notifications-plugin/subscribe',
    method: 'post',
    input: subscriptionSchema,
  }).returns<{ success: true; alreadySubscribed?: boolean }>(),

  unsubscribe: defineProcedure({
    path: '/notifications-plugin/unsubscribe',
    method: 'post',
    input: subscriptionSchema,
  }).returns<{ success: true }>(),
};
