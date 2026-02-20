import {
  createPluginContext,
  defineProcedure,
} from '@davincicoding/payload-plugin-kit';
import { z } from 'zod/v4-mini';

export const VIRTUAL_MESSAGES_FIELD_NAME = '_inlt_scoped_messages';

// TODO move to types
const normalizedScopeSchema = z.object({
  position: z.enum(['tab', 'sidebar']),
  existingFieldsTabLabel: z.optional(z.string()),
});

export const PLUGIN_CONTEXT = createPluginContext(
  'payload-intl',
  z.object({
    globalSlug: z.string(),
    // scopes: z.map(z.string(), normalizedScopeSchema),
  }),
);
