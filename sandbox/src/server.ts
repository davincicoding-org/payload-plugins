import { fetchMessages } from 'payload-intl';
import { createRequestHandler } from 'payload-smart-cache';
import { env } from '@/env';

export const fetchCachedMessages = createRequestHandler(
  (locale: string) => fetchMessages({ serverUrl: env.BASE_URL }, locale),
  ['messages'],
);
