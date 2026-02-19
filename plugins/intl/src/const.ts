import { defineProcedure } from '@davincicoding/payload-plugin-kit';

export const ENDPOINTS = {
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
