import { createPluginContext } from '@davincicoding/payload-plugin-kit';
import type { NotificationPluginContext } from './types';

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
