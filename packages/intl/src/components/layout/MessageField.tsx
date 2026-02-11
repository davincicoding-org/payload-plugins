import { useMemo } from 'react';
import { useMessagesForm } from '@/components/MessageFormContext';
import type { MessageSchema } from '@/types';
import { parseMessageSchema } from '@/utils/schema';
import { createValidator } from '@/utils/validate';

import { MessageController } from '../MessageController';
import styles from './MessageField.module.css';

interface MessageFieldProps {
  schema: MessageSchema;
  messageKey: string;
  path: string;
  hidden?: boolean;
}

export function MessageField({
  schema,
  messageKey,
  path,
  hidden,
}: MessageFieldProps): React.ReactNode {
  const { locales } = useMessagesForm();

  const config = useMemo(() => parseMessageSchema(schema), [schema]);

  const validator = useMemo(
    () => createValidator(config.variables),
    [config.variables],
  );

  const [firstLocale, ...otherLocales] = locales;

  if (!firstLocale) return null;

  return (
    <div style={{ display: hidden ? 'none' : undefined }}>
      {config.description && <p>{config.description}</p>}

      {otherLocales.length === 0 ? (
        <MessageController
          locale={firstLocale}
          name={[firstLocale, path, messageKey].join('.')}
          validate={validator}
          variables={config.variables}
        />
      ) : (
        <div
          className={[styles.localeRow, styles.localeRowScrollable]
            .filter(Boolean)
            .join(' ')}
        >
          {locales.map((locale) => (
            <MessageController
              className={styles.localeItem}
              key={locale}
              label={locale.toUpperCase()}
              locale={locale}
              name={[locale, path, messageKey].join('.')}
              validate={validator}
              variables={config.variables}
            />
          ))}
        </div>
      )}
    </div>
  );
}
