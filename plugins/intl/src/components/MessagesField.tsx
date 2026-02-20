'use client';

import { useField } from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages, MessagesSchema } from '@/types';
import { MessagesTree } from './layout/MessagesTree';

export interface MessagesFieldProps {
  readonly schema: MessagesSchema;
  readonly hiddenGroups?: string[];
}

/**
 * Payload JSON field client component that bridges the virtual `_intlMessages`
 * field with the existing MessagesFormProvider / MessagesTree component tree.
 */
export function MessagesField({
  schema,
  hiddenGroups,
  path,
}: JSONFieldClientProps & MessagesFieldProps) {
  const { value, setValue } = useField<Messages>({ path });

  const form = useForm<Messages>({
    values: value,
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
    <MessagesTree
      control={form.control}
      hiddenGroups={hiddenGroups}
      path=""
      schema={schema}
    />
  );
}
