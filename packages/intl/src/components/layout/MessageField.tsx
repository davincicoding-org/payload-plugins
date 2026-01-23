import { useMemo } from 'react';
import { useMessagesForm } from '@/context/messages-form';
import type { MessageSchema } from '@/types';
import { cn } from '@/utils/cn';
import { parseMessageSchema } from '@/utils/schema';
import { createValidator } from '@/utils/validate';

import { MessageController } from '../MessageController';

interface MessageFieldProps {
  schema: MessageSchema;
  messageKey: string;
  path: string;
  className?: string;
}

export function MessageField({
  schema,
  messageKey,
  path,
  className,
}: MessageFieldProps): React.ReactNode {
  const { locales } = useMessagesForm();

  const config = useMemo(() => parseMessageSchema(schema), [schema]);

  const validator = useMemo(
    () => createValidator(config.variables),
    [config.variables],
  );

  return (
    <div className={cn('', className)}>
      {config.description && <p>{config.description}</p>}

      {locales.length === 1 ? (
        <MessageController
          className={className}
          locale={locales[0]}
          name={[locales[0], path, messageKey].join('.')}
          type={config.type}
          validate={validator}
          variables={config.variables}
        />
      ) : (
        <div
          className={cn('-mx-3 flex min-w-0 gap-4 px-3', {
            'overflow-x-auto': config.type === 'icu',
            // "flex-col": config.type === "rich",
          })}
        >
          {locales.map((locale) => (
            <MessageController
              className="flex-1"
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
