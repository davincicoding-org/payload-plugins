import clsx from 'clsx';
import { get } from 'lodash-es';
import { memo, useMemo } from 'react';
import { useFormState, useWatch } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessagesFormProvider';
import type { MessageSchema } from '@/types';
import { toWords } from '@/utils/format';
import { parseMessageSchema } from '@/utils/schema';
import { createValidator } from '@/utils/validate';

import { MessageFormField } from '../MessageFormField';
import { GroupStatusDot } from './GroupStatusDot';
import styles from './MessageField.module.css';

interface MessageFieldProps {
  schema: MessageSchema;
  messageKey: string;
  path: string;
  hidden?: boolean;
  showStatus?: boolean;
}

export const MessageField = memo(function MessageField({
  schema,
  messageKey,
  path,
  hidden,
  showStatus,
}: MessageFieldProps): React.ReactNode {
  const { defaultLocale, activeLocale, control } = useMessagesForm();

  const config = useMemo(() => parseMessageSchema(schema), [schema]);

  const validator = useMemo(
    () => createValidator(config.variables),
    [config.variables],
  );

  const multiline = schema.includes('\n');
  const isDefaultLocale = activeLocale === defaultLocale;
  const fieldPath = [path, messageKey].filter(Boolean).join('.');
  const fullName = `${activeLocale}.${fieldPath}`;

  const defaultValue = useWatch({ name: `${defaultLocale}.${fieldPath}` }) as
    | string
    | undefined;

  const { errors } = useFormState({ control });
  const hasError = get(errors, fullName) !== undefined;

  const content = (
    <div style={{ display: hidden ? 'none' : undefined }}>
      {config.description && <p>{config.description}</p>}

      <MessageFormField
        locale={activeLocale}
        multiline={multiline}
        name={fullName}
        reference={!isDefaultLocale ? defaultValue : undefined}
        validate={validator}
        variables={config.variables}
      />
    </div>
  );

  if (showStatus !== undefined) {
    return (
      <div className={clsx(styles.row, hasError && styles.rowError)}>
        <span className={styles.label}>
          {toWords(messageKey)}
          {showStatus && <GroupStatusDot path={fieldPath} />}
        </span>
        <div className={styles.input}>{content}</div>
      </div>
    );
  }

  return content;
});
