import { createPluginContext } from '@davincicoding/payload-plugin-kit';
import { z } from 'zod/v4-mini';

export const VIRTUAL_MESSAGES_FIELD_NAME = '_inlt_scoped_messages';

export const PLUGIN_CONTEXT = createPluginContext(
  'payload-intl',
  z.object({
    globalSlug: z.string(),
  }),
);
