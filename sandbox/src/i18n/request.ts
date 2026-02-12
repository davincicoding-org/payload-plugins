import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { fetchCachedMessages } from '@/app/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = (await requestLocale) || 'en';
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = await fetchCachedMessages(locale);

  return {
    locale,
    messages,
  };
});
