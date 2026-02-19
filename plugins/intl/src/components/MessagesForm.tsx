'use client';

import { Button, useStepNav } from '@payloadcms/ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormValues } from '@/components/MessagesFormProvider';
import { MessagesFormProvider } from '@/components/MessagesFormProvider';
import type {
  DeepPartial,
  Locale,
  Messages,
  MessagesSchema,
  NormalizedScope,
  Translations,
} from '@/types';
import { JsonImport } from './actions/JsonImport';
import { ScopesButton } from './actions/ScopesButton';
import { useMessagesFormSubmit } from './hooks/useMessagesFormSubmit';
import { MessageField } from './layout/MessageField';
import { MessagesTabs } from './layout/MessagesTabs';
import { MessagesTree } from './layout/MessagesTree';
import styles from './MessagesForm.module.css';

interface MessagesFormProps {
  locales: Locale[];
  defaultLocale: Locale;
  activeLocale: Locale;
  schema: MessagesSchema;
  scopes: Map<string, NormalizedScope>;
  tabs?: boolean;
  values: Translations<DeepPartial<Messages>>;
  endpointUrl: string;
}

export function MessagesForm({
  locales,
  defaultLocale,
  activeLocale,
  schema,
  scopes,
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
    reValidateMode: 'onBlur',
  });
  const [activeTab, setActiveTab] = useState(Object.keys(schema)[0]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [form]);

  const handleSubmit = useMessagesFormSubmit({
    endpointUrl,
    defaultValues: values,
    form,
  });

  return (
    <MessagesFormProvider
      activeLocale={activeLocale}
      defaultLocale={defaultLocale}
      form={form}
      locales={locales}
    >
      <form className={styles.form} onSubmit={form.handleSubmit(handleSubmit)}>
        <div className={styles.stickyHeader}>
          <header className={styles.header}>
            <h1 className={styles.title}>Messages</h1>
            <div className={styles.actions}>
              <ScopesButton scopes={scopes} />
              <JsonImport activeLocale={activeLocale} />
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
