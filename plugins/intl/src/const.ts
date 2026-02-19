import {
  createPluginContext,
  defineProcedure,
} from '@davincicoding/payload-plugin-kit';
import { z } from 'zod/v4-mini';

export const PLUGIN_CONTEXT = createPluginContext(
  'payload-intl',
  z.object({
    collectionSlug: z.string(),
    storage: z.enum(['db', 'upload']),
  }),
);

export const ENDPOINTS = {
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
