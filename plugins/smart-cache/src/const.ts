import { defineProcedure } from '@repo/common';

export const ENDPOINTS = {
  publishChanges: defineProcedure({
    path: '/smart-cache/publish',
    method: 'post',
  }),
  checkChanges: defineProcedure({
    path: '/smart-cache/check',
    method: 'get',
  }).returns<{ hasChanges: boolean }>(),
};
