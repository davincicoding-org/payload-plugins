'use client';

import { createContext, use } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useFormContext } from 'react-hook-form';
import type { Locale, Messages, Translations } from '@/types';

export type FormValues = Translations<Messages>;

const MessagesFormContext = createContext<{
  locales: Locale[];
}>({
  locales: ['en'],
});

interface MessagesFormProviderProps {
  locales: Locale[];
  form: UseFormReturn<FormValues>;
}

export function MessagesFormProvider({
  locales,
  form,
  children,
}: React.PropsWithChildren<MessagesFormProviderProps>) {
  return (
    <MessagesFormContext value={{ locales }}>
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
