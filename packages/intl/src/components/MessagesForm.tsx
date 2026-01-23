'use client';

import { Button, toast, useStepNav } from '@payloadcms/ui';
import { isEqual } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormValues } from '@/context/messages-form';
import { MessagesFormProvider } from '@/context/messages-form';
import type {
  DeepPartial,
  Locales,
  Messages,
  MessagesSchema,
  Translations,
} from '@/types';
import { cn } from '@/utils/cn';
import { getErrorMessage } from '@/utils/error-handling';
import { JsonImport } from './actions/JsonImport';
import { MessageField } from './layout/MessageField';
import { MessagesTabs } from './layout/MessagesTabs';
import { MessagesTree } from './layout/MessagesTree';

interface MessagesFormProps {
  locales: Locales;
  schema: MessagesSchema;
  tabs?: boolean;
  values: Translations<DeepPartial<Messages>>;
  endpointUrl: string;
}

export function MessagesForm({
  locales,
  schema,
  tabs = false,
  values,
  endpointUrl,
}: MessagesFormProps): React.ReactNode {
  const { setStepNav } = useStepNav();
  useEffect(() => {
    setStepNav([{ label: 'Intl Messages', url: '/intl' }]);
  }, [setStepNav]);

  const form = useForm<FormValues>({
    defaultValues: values,
    reValidateMode: 'onChange',
  });
  const [activeTab, setActiveTab] = useState(Object.keys(schema)[0]);

  const handleSubmit = async (currentValues: FormValues) => {
    const toastId = toast.loading('Saving...');
    const changes = Object.entries(currentValues).reduce<
      Translations<Messages>
    >((acc, [locale, value]) => {
      const hasChanged = !isEqual(value, values[locale]);
      if (!hasChanged) return acc;
      acc[locale] = value;
      return acc;
    }, {});

    try {
      const response = await fetch(endpointUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const error = await getErrorMessage(response);
        throw new Error(error);
      }

      form.reset(currentValues);
      toast.success('Saved', { id: toastId });
    } catch (error) {
      toast.error(
        `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: toastId },
      );
    }
  };

  return (
    <MessagesFormProvider form={form} locales={locales}>
      <form
        className="flex h-[calc(100vh-var(--app-header-height))] flex-col"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="sticky top-0 z-10 bg-background">
          <header className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-4xl">Messages</h1>
            <div className="flex items-center gap-2">
              <JsonImport />
              <Button
                className="my-0"
                disabled={!form.formState.isDirty}
                type="submit"
              >
                Save
              </Button>
            </div>
          </header>

          {tabs && (
            <MessagesTabs
              activeTab={activeTab}
              schema={schema}
              setActiveTab={setActiveTab}
            />
          )}
        </div>

        <div
          className="min-h-0 overflow-y-auto pt-8 pb-16"
          id="messages-form-content"
        >
          {!tabs && <MessagesTree nestingLevel={0} path="" schema={schema} />}
          {tabs &&
            Object.entries(schema).map(([key, value]) => {
              if (typeof value === 'string') {
                return (
                  <MessageField
                    className={cn({ hidden: activeTab !== key })}
                    key={key}
                    messageKey={key}
                    path={key}
                    schema={value}
                  />
                );
              }
              return (
                <MessagesTree
                  className={cn({ hidden: activeTab !== key })}
                  key={key}
                  nestingLevel={0}
                  path={key}
                  schema={value}
                />
              );
            })}
        </div>
      </form>
    </MessagesFormProvider>
  );
}
