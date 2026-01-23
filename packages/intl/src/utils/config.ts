import type { Config, LocalizationConfig, SanitizedConfig } from 'payload';
import { z } from 'zod/v4-mini';
import type { Locales } from '@/types';

export const getSupportedLocales = (
  localization: false | LocalizationConfig | undefined,
): Locales => {
  if (!localization) {
    throw new Error(
      'You need to enable "localization" in your Payload config.',
    );
  }
  if (localization.locales.length === 0) {
    return [localization.defaultLocale];
  }
  return localization.locales.map((locale) => {
    if (typeof locale === 'string') {
      return locale;
    }
    return locale.code;
  }) as Locales;
};

const PLUGIN_KEY = 'intl-plugin';
const pluginContextSchema = z.object({
  collectionSlug: z.string(),
});
type PluginContext = z.infer<typeof pluginContextSchema>;

export const attachPluginContext = (config: Config, context: PluginContext) => {
  config.custom ??= {};
  config.custom[PLUGIN_KEY] = context;
};

export const getPluginContext = (config: SanitizedConfig): PluginContext =>
  pluginContextSchema.parse(config.custom?.[PLUGIN_KEY]);
