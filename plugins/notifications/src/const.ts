import type { EndpointConfig } from '@davincicoding/payload-plugin-kit';
import { createPluginContext } from '@davincicoding/payload-plugin-kit';
import { z } from 'zod';
import type { NotificationPluginContext } from './types';
import { markReadSchema, subscriptionSchema } from './types';

export const PLUGIN_KEY = 'notifications-plugin';

export const PLUGIN_CONTEXT = createPluginContext('payload-notifications', {
  safeParse(
    data: unknown,
  ): { success: true; data: NotificationPluginContext } | { success: false } {
    if (typeof data !== 'object' || data === null)
      return {
        success: false,
      };
    const d = data as Record<string, unknown>;
    if (typeof d.pollInterval !== 'number') return { success: false };
    if (typeof d.collectionSlugs !== 'object')
      return {
        success: false,
      };
    return { success: true, data: data as NotificationPluginContext };
  },
});

export const ENDPOINTS = {
  unread: {
    path: '/notifications-plugin/unread',
    method: 'get',
    input: z.object({ since: z.string().datetime().optional() }),
  },
  read: {
    path: '/notifications-plugin/read',
    method: 'get',
    input: z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
    }),
  },
  markRead: {
    path: '/notifications-plugin/mark-read',
    method: 'post',
    input: markReadSchema,
  },
  markAllRead: {
    path: '/notifications-plugin/mark-all-read',
    method: 'post',
  },
  updatePreferences: {
    path: '/notifications-plugin/preferences',
    method: 'post',
    input: z.object({ emailEnabled: z.boolean() }),
  },
  unsubscribe: {
    path: '/notifications-plugin/unsubscribe',
    method: 'post',
    input: subscriptionSchema,
  },
  deleteNotification: {
    path: '/notifications-plugin/delete',
    method: 'post',
    input: markReadSchema,
  },
  openNotification: {
    path: '/notifications-plugin/open',
    method: 'get',
    input: markReadSchema.extend({ json: z.literal('true').optional() }),
  },
  emailUnsubscribe: {
    path: '/notifications-plugin/email-unsubscribe',
    method: 'get',
    input: z.object({ token: z.string() }),
  },
} satisfies Record<string, EndpointConfig>;
