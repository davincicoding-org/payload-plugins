'use client';

import { Button, useField } from '@payloadcms/ui';
import { IconWorld } from '@tabler/icons-react';
import type { JSONFieldClient } from 'payload';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { FormValues } from '@/components/MessagesFormProvider';
import { MessagesFormProvider } from '@/components/MessagesFormProvider';
import type {
  DeepPartial,
  Messages,
  MessagesSchema,
  Translations,
} from '@/types';
import { MessagesTree } from './layout/MessagesTree';
import styles from './ScopedMessagesField.module.css';

export interface ScopedMessagesFieldProps {
  readonly scopeKey: string;
  readonly schema: MessagesSchema;
}

/**
 * Payload JSON field client component that bridges the virtual `_intlMessages`
 * field with the existing MessagesFormProvider / MessagesTree component tree.
 *
 * The `JSONFieldClientComponent` type is not re-exported from `payload` at the
 * package boundary, so we type the props explicitly based on Payload's
 * `ClientFieldBase<JSONFieldClient>` shape plus the custom `clientProps`.
 */
export function ScopedMessagesField({
  path,
  scopeKey,
  schema,
}: {
  readonly field: JSONFieldClient;
  readonly path: string;
} & ScopedMessagesFieldProps): React.ReactNode {
  const { value, setValue } = useField<Translations<DeepPartial<Messages>>>({
    path: path ?? '_intlMessages',
  });

  const locales = useMemo(() => (value ? Object.keys(value) : []), [value]);
  const defaultLocale = locales[0] ?? 'en';
  const [activeLocale, setActiveLocale] = useState(defaultLocale);

  const form = useForm<FormValues>({
    defaultValues: value ?? {},
    reValidateMode: 'onBlur',
  });

  // When form values change, push back to Payload's field
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      setValue(formValues);
    });
    return () => subscription.unsubscribe();
  }, [form, setValue]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.localeSelector}>
          {locales.map((locale) => (
            <Button
              buttonStyle={activeLocale === locale ? 'pill' : 'tab'}
              key={locale}
              onClick={() => setActiveLocale(locale)}
              size="small"
              type="button"
            >
              {locale.toUpperCase()}
            </Button>
          ))}
        </div>
        <a className={styles.sharedLink} href="/admin/intl">
          <IconWorld size={16} strokeWidth={1.5} />
          Shared messages
        </a>
      </div>

      <MessagesFormProvider
        activeLocale={activeLocale}
        defaultLocale={defaultLocale}
        form={form}
        locales={locales}
      >
        <MessagesTree nestingLevel={0} path="" schema={schema} />
      </MessagesFormProvider>
    </div>
  );
}
