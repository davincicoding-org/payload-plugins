import { useMemo } from 'react';
import { useMessagesForm } from '@/context/messages-form';
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

  return (
    <div style={{ display: hidden ? 'none' : undefined }}>
      {config.description && <p>{config.description}</p>}

      {locales.length === 1 ? (
        <MessageController
          locale={locales[0]}
          name={[locales[0], path, messageKey].join('.')}
          type={config.type}
          validate={validator}
          variables={config.variables}
        />
      ) : (
        <div
          className={[
            styles.localeRow,
            config.type === 'icu' ? styles.localeRowScrollable : undefined,
          ]
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
              type={config.type}
              validate={validator}
              variables={config.variables}
            />
          ))}
        </div>
      )}
    </div>
  );
}
