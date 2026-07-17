import type { BasePayload } from 'payload';
import { PLUGIN_CONTEXT } from '@/const';
import type { Locale, MessagesSchema } from '@/types';
import { resolveFallbackLocales } from '@/utils/fallback-locales';
import { mergeMessages } from '@/utils/merge';

export async function fetchMessages(
  payload: BasePayload,
  locale: string,
  options: { fallbackLocale?: Locale | Locale[] | false } = {},
): Promise<MessagesSchema> {
  const context = PLUGIN_CONTEXT.get(payload.config);
  if (!context) {
    throw new Error(
      '[payload-intl] Plugin context not found. Is the plugin registered?',
    );
  }

  const slug = context.globalSlug as 'messages';

  const readLocale = async (target: string): Promise<MessagesSchema> => {
    const { data } = await payload.findGlobal({
      slug,
      // @ts-expect-error FIXME dynamic locale slug
      locale: target,
      // @ts-expect-error Payload type definition expects null | undefined, we pass false
      fallbackLocale: false,
      select: { data: true },
    });
    return data ?? {};
  };

  const requested = await readLocale(locale);

  const fallbackLocales = resolveFallbackList({
    override: options.fallbackLocale,
    localization: payload.config.localization,
    locale,
  });

  let merged = requested;
  for (const fallbackLocale of fallbackLocales) {
    const fallbackData = await readLocale(fallbackLocale);
    merged = mergeMessages(merged, fallbackData);
  }

  return merged;
}

function resolveFallbackList(options: {
  override: Locale | Locale[] | false | undefined;
  localization: BasePayload['config']['localization'];
  locale: string;
}): Locale[] {
  const { override, localization, locale } = options;

  if (override === false) return [];
  if (override === undefined) {
    return resolveFallbackLocales({ localization, locale });
  }
  return Array.isArray(override) ? override : [override];
}
