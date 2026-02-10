import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { fetchMessages } from 'payload-intl';
import { env } from '@/env';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) || 'en';
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = await fetchMessages({ serverUrl: env.BASE_URL }, locale);

  return {
    locale,
    messages,
  };
});
