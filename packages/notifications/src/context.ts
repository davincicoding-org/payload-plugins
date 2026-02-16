import type { Config, SanitizedConfig } from 'payload';
import type { NotificationsConfig } from './types';

const PLUGIN_KEY = 'notifications-plugin';

export interface PluginContext {
  notificationsSlug: string;
  subscriptionsSlug: string;
  pollInterval: number;
  email: NotificationsConfig['email'];
  onNotify: NotificationsConfig['onNotify'];
}

/**
 * Attach the resolved plugin config to Payload's `config.custom` so it can
 * be retrieved later without threading options through every call site.
 */
export const attachPluginContext = (
  config: Config,
  context: PluginContext,
): void => {
  config.custom ??= {};
  config.custom[PLUGIN_KEY] = context;
};

/**
 * Retrieve the plugin context previously stored by `attachPluginContext`.
 * Throws if the plugin was not registered, surfacing a clear error message.
 */
export const getPluginContext = (config: SanitizedConfig): PluginContext => {
  const ctx = config.custom?.[PLUGIN_KEY] as PluginContext | undefined;
  if (!ctx) {
    throw new Error(
      '[payload-notifications] Plugin context not found. Did you add notificationsPlugin() to your plugins array?',
    );
  }
  return ctx;
};
