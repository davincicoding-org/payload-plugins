import configPromise from '@payload-config';
import { getPayload } from 'payload';
import { fetchMessages } from 'payload-intl';
import { createRequestHandler } from 'payload-smart-cache';

export const fetchCachedMessages = createRequestHandler(
  async (locale: string) => {
    const payload = await getPayload({ config: configPromise });
    return fetchMessages(payload, locale);
  },
  ['messages'],
);
