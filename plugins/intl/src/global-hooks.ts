import type { GlobalAfterReadHook, GlobalBeforeChangeHook } from 'payload';
import { PLUGIN_CONTEXT } from '@/const';
import { fetchMessages } from '@/requests/fetchMessages';
import { getSupportedLocales } from '@/utils/config';

/**
 * Creates an afterRead hook that populates the virtual `_intlMessages`
 * field with scoped translations from the messages collection.
 */
export function createAfterReadHook(scopeKey: string): GlobalAfterReadHook {
  return async ({ doc, req }) => {
    const locales = getSupportedLocales(req.payload.config.localization);

    const translations: Record<string, unknown> = {};
    for (const locale of locales) {
      const allMessages = await fetchMessages(req.payload, locale);
      const scoped = (allMessages as Record<string, unknown>)[scopeKey];
      translations[locale] = scoped ?? {};
    }

    return { ...doc, _intlMessages: translations };
  };
}

/**
 * Creates a beforeChange hook that extracts `_intlMessages` from the
 * incoming data, merges each locale's scoped key back into the messages
 * collection, and strips the virtual field before persistence.
 */
export function createBeforeChangeHook(
  scopeKey: string,
): GlobalBeforeChangeHook {
  return async ({ data, req }) => {
    const intlMessages = data._intlMessages as
      | Record<string, unknown>
      | undefined;

    if (!intlMessages) return data;

    const ctx = PLUGIN_CONTEXT.get(req.payload.config);
    if (!ctx) return data;

    const { collectionSlug } = ctx;

    for (const [locale, scopedMessages] of Object.entries(intlMessages)) {
      const { docs } = await req.payload.find({
        collection: collectionSlug as 'messages',
        where: { locale: { equals: locale } },
        limit: 1,
        req,
      });

      const existingDoc = docs[0];
      const existingData =
        (existingDoc?.data as Record<string, unknown> | undefined) ?? {};
      const mergedData = { ...existingData, [scopeKey]: scopedMessages };

      if (existingDoc) {
        await req.payload.update({
          collection: collectionSlug as 'messages',
          id: existingDoc.id,
          data: { data: mergedData },
          req,
        });
      } else {
        await req.payload.create({
          collection: collectionSlug as 'messages',
          data: { locale, data: mergedData },
          req,
        });
      }
    }

    const { _intlMessages: _, ...rest } = data;
    return rest;
  };
}
