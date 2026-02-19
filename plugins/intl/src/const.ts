import { defineProcedure } from '@davincicoding/payload-plugin-kit';
import { z } from 'zod';
import type { Messages } from './types';

export const ENDPOINTS = {
  getMessages: defineProcedure({
    path: '/intl-plugin/:locale',
    method: 'get',
    input: z.object({ locale: z.string() }),
  }).returns<Messages>(),
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
