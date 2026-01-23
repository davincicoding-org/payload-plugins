import config from '@payload-config';
import { getRequestConfig } from 'next-intl/server';
import { getPayload } from 'payload';
import { fetchMessages } from 'payload-intl';
import { env } from '@/env';
import { messages as defaultMessages } from './messages';

export default getRequestConfig(async () => {
  const locale = 'en';
  const payload = await getPayload({ config });
  const messages =
    env.NODE_ENV === 'development'
      ? await fetchMessages(payload, locale)
      : defaultMessages;

  return {
    locale,
    messages,
  };
});
