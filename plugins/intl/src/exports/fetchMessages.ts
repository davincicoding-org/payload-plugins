import type { BasePayload } from 'payload';
import { PLUGIN_CONTEXT } from '@/const';
import type { MessagesSchema } from '@/types';

export async function fetchMessages(
  payload: BasePayload,
  locale: string,
): Promise<MessagesSchema> {
  const ctx = PLUGIN_CONTEXT.get(payload.config);
  if (!ctx) {
    throw new Error(
      '[payload-intl] Plugin context not found. Is the plugin registered?',
    );
  }

  const { data: messages } = await payload.findGlobal({
    slug: ctx.globalSlug as 'messages',
    // @ts-expect-error FIXME
    locale,
    select: { data: true },
  });

  return messages;
}
