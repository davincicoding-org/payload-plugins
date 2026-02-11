'use client';

import { Button, toast, useDocumentEvents, useStepNav } from '@payloadcms/ui';
import { isEqual } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormValues } from '@/components/MessageFormContext';
import { MessagesFormProvider } from '@/components/MessageFormContext';
import type {
  DeepPartial,
  Locale,
  Messages,
  MessagesSchema,
  Translations,
} from '@/types';
import { getErrorMessage } from '@/utils/error-handling';
import { JsonImport } from './actions/JsonImport';
import { MessageField } from './layout/MessageField';
import { MessagesTabs } from './layout/MessagesTabs';
import { MessagesTree } from './layout/MessagesTree';
import styles from './MessagesForm.module.css';

interface MessagesFormProps {
  locales: Locale[];
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
  const { reportUpdate } = useDocumentEvents();
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
      reportUpdate({
        entitySlug: 'messages',
        operation: 'update',
        updatedAt: new Date().toISOString(),
      });
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
      <form className={styles.form} onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={styles.stickyHeader}>
          <header className={styles.header}>
            <h1 className={styles.title}>Messages</h1>
            <div className={styles.actions}>
              <JsonImport />
              <Button
                className={styles.saveButton}
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

        <div className={styles.content} id="messages-form-content">
          {!tabs && <MessagesTree nestingLevel={0} path="" schema={schema} />}
          {tabs &&
            Object.entries(schema).map(([key, value]) => {
              if (typeof value === 'string') {
                return (
                  <MessageField
                    hidden={activeTab !== key}
                    key={key}
                    messageKey={key}
                    path={key}
                    schema={value}
                  />
                );
              }
              return (
                <MessagesTree
                  hidden={activeTab !== key}
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
