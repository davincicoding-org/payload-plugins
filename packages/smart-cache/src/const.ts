import type { Endpoint } from 'payload';

import type { CollectionOperation } from './types';

export const ENDPOINT_CONFIG = {
  publish: {
    path: '/cache-plugin/publish',
    method: 'post',
  },
  check: {
    path: '/cache-plugin/check',
    method: 'get',
  },
} satisfies Record<string, Pick<Endpoint, 'path' | 'method'>>;

export const DEFAULT_OPERATIONS: CollectionOperation[] = [
  'create',
  'update',
  'delete',
];
