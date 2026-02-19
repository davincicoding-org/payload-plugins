import type { Config, SanitizedConfig } from 'payload';
import { z } from 'zod/v4-mini';
import type { Locale } from '../types';

export const getSupportedLocales = (
  localization: Config['localization'],
): Locale[] => {
  if (!localization) {
    return [];
  }
  if (localization.locales.length === 0) {
    return [localization.defaultLocale];
  }
  return localization.locales.map((locale) => {
    if (typeof locale === 'string') {
      return locale;
    }
    return locale.code;
  });
};

const PLUGIN_KEY = 'intl-plugin';
const pluginContextSchema = z.object({
  collectionSlug: z.string(),
  storage: z.enum(['db', 'upload']),
});
type PluginContext = z.infer<typeof pluginContextSchema>;

export const attachPluginContext = (config: Config, context: PluginContext) => {
  config.custom ??= {};
  config.custom[PLUGIN_KEY] = context;
};

export const getPluginContext = (config: SanitizedConfig): PluginContext =>
  pluginContextSchema.parse(config.custom?.[PLUGIN_KEY]);
