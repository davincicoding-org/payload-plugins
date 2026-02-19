import {
  createPluginContext,
  defineProcedure,
} from '@davincicoding/payload-plugin-kit';
import { z } from 'zod/v4-mini';

const normalizedScopeSchema = z.object({
  position: z.enum(['tab', 'sidebar']),
  existingFieldsTabLabel: z.optional(z.string()),
});

export const PLUGIN_CONTEXT = createPluginContext(
  'payload-intl',
  z.object({
    collectionSlug: z.string(),
    storage: z.enum(['db', 'upload']),
    scopes: z.map(z.string(), normalizedScopeSchema),
  }),
);

export const ENDPOINTS = {
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
