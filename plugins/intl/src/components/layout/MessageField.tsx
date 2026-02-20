import { get } from 'lodash-es';
import { memo, useMemo } from 'react';
import { type Control, Controller, useFormState } from 'react-hook-form';
import { toWords } from '@/components/input/utils';
import { createValidator, parseMessageSchema } from '@/icu';
import type { Messages } from '@/types';
import { MessageInput } from '../input/MessageInput';
import { ReferencePopover } from '../input/ReferencePopover';
import styles from './MessageField.module.css';

interface MessageFieldProps {
  schema: string;
  messageKey: string;
  path: string;
  control: Control<Messages>;
  reference: string | undefined;
}

export const MessageField = memo(function MessageField({
  schema,
  messageKey,
  path,
  control,
  reference,
}: MessageFieldProps): React.ReactNode {
  const config = useMemo(() => parseMessageSchema(schema), [schema]);

  const validator = useMemo(
    () => createValidator(config.variables),
    [config.variables],
  );

  const multiline = schema.includes('\n');
  const fieldPath = [path, messageKey].filter(Boolean).join('.');

  const { errors } = useFormState({ control });
  const hasError = get(errors, fieldPath) !== undefined;

  return (
    <div className={styles.root} data-error={hasError}>
      <span className={styles.label}>{toWords(messageKey)}</span>

      <Controller
        control={control}
        name={fieldPath}
        render={({ field, fieldState }) => (
          <>
            <ReferencePopover reference={reference}>
              <fieldset
                className={styles.fieldset}
                data-error={fieldState.error !== undefined}
              >
                <MessageInput
                  error={fieldState.error !== undefined}
                  multiline={multiline}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={(field.value as unknown as string) || ''}
                  variables={config.variables}
                />
              </fieldset>
            </ReferencePopover>
            {fieldState.error?.message && (
              <p className={styles.errorMessage}>{fieldState.error.message}</p>
            )}
          </>
        )}
        rules={{
          required: true,
          validate: validator,
        }}
      />
    </div>
  );
});
