'use client';

import { useField } from '@payloadcms/ui';
import type { JSONFieldClientProps } from 'payload';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { Messages, MessagesSchema } from '@/types';
import { MessagesTree } from './layout/MessagesTree';

export interface MessagesFieldProps {
  readonly schema: MessagesSchema;
  readonly hiddenGroups?: string[];
}

/**
 * Order-independent JSON serialization that strips `undefined` values.
 * Prevents false-positive mismatches caused by key insertion order
 * differences between react-hook-form's internal state and the value
 * returned by Payload's useField.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        if ((val as Record<string, unknown>)[k] !== undefined) {
          sorted[k] = (val as Record<string, unknown>)[k];
        }
      }
      return sorted;
    }
    return val;
  });
}

/**
 * Payload JSON field client component that bridges the virtual `_intlMessages`
 * field with the existing MessagesFormProvider / MessagesTree component tree.
 *
 * Uses `defaultValues` (uncontrolled) instead of `values` (controlled) to
 * prevent react-hook-form's automatic value sync from creating an infinite
 * re-render loop with Payload's form state.
 */
export function MessagesField({
  schema,
  hiddenGroups,
  path,
}: JSONFieldClientProps & MessagesFieldProps) {
  const { value, setValue } = useField<Messages>({ path });
  const lastSyncedRef = useRef(stableStringify(value));

  const form = useForm<Messages>({
    defaultValues: value ?? {},
    reValidateMode: 'onBlur',
  });

  // Payload → RHF: reset form only when value changes from an external source
  // (locale switch, draft save, etc.), not from our own setValue echo.
  useEffect(() => {
    const serialized = stableStringify(value);
    if (serialized !== lastSyncedRef.current) {
      lastSyncedRef.current = serialized;
      form.reset(value ?? {});
    }
  }, [value, form]);

  // RHF → Payload: push user edits back to Payload's form state.
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      const serialized = stableStringify(formValues);
      if (serialized !== lastSyncedRef.current) {
        lastSyncedRef.current = serialized;
        setValue(formValues);
      }
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
