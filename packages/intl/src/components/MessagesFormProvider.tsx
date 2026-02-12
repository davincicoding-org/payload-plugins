'use client';

import { createContext, use } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useFormContext } from 'react-hook-form';
import type { Locale, Messages, Translations } from '@/types';

export type FormValues = Translations<Messages>;

const MessagesFormContext = createContext<{
  locales: Locale[];
  defaultLocale: Locale;
  activeLocale: Locale;
}>({
  locales: ['en'],
  defaultLocale: 'en',
  activeLocale: 'en',
});

interface MessagesFormProviderProps {
  locales: Locale[];
  defaultLocale: Locale;
  activeLocale: Locale;
  form: UseFormReturn<FormValues>;
}

export function MessagesFormProvider({
  locales,
  defaultLocale,
  activeLocale,
  form,
  children,
}: React.PropsWithChildren<MessagesFormProviderProps>) {
  return (
    <MessagesFormContext value={{ locales, defaultLocale, activeLocale }}>
      <FormProvider {...form}>{children}</FormProvider>
    </MessagesFormContext>
  );
}

export const useMessagesForm = () => {
  const context = use(MessagesFormContext);
  const form = useFormContext<FormValues>();
  return {
    ...context,
    ...form,
  };
};
