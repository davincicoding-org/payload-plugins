import { isEqual } from 'lodash-es';
import type { FieldHook } from 'payload';
import type { Messages } from './types';

/**
 * Populates the virtual `_intlMessages` field with scoped
 * translations from the messages collection after read.
 */
export const createPopulateScopedMessagesHook =
  ({
    globalSlug,
    scope,
  }: {
    globalSlug: 'messages';
    scope: string;
  }): FieldHook<any, Messages> =>
  async ({ req: { locale, payload } }) => {
    if (!locale) return {};
    const { data: messages = {} } = await payload.findGlobal({
      slug: globalSlug,
      locale,
      select: { data: true },
    });

    return messages[scope] as Messages;
  };

/**
 * Extracts `_intlMessages` from the incoming data,
 * merges each locale's scoped key back into the messages
 * collection, and strips the virtual field before persistence.
 */
export const createExtractScopedMessagesHook =
  ({
    globalSlug,
    scope,
  }: {
    globalSlug: 'messages';
    scope: string;
  }): FieldHook<any, Messages> =>
  async ({ value, previousValue, req: { payload, locale } }) => {
    if (!value) return {};
    // TODO check if this can be derived from the FieldHook args instead
    if (isEqual(value, previousValue)) return value;

    const { data: allMessages = {} } = await payload.findGlobal({
      slug: globalSlug as 'messages',
      locale,
      select: { data: true },
    });

    const updatedMessages = {
      ...allMessages,
      [scope]: value,
    };

    await payload.updateGlobal({
      slug: globalSlug as 'messages',
      locale,
      data: { data: updatedMessages },
    });

    return value;
  };
