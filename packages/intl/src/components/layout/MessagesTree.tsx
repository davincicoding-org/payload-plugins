import { Collapsible } from '@payloadcms/ui';
import { get } from 'lodash-es';
import { useCallback } from 'react';
import { useFormState } from 'react-hook-form';
import { useMessagesForm } from '@/context/messages-form';
import type { Messages } from '@/types';
import { cn } from '@/utils/cn';
import { toWords } from '@/utils/format';

import { MessageField } from './MessageField';

interface MessagesTreeProps {
  path: string;
  nestingLevel: number;
  schema: Messages;
  className?: string;
}

// TODO fix sticky position on single locale form

export function MessagesTree({
  path,
  schema,
  nestingLevel = 0,
  className,
}: MessagesTreeProps): React.ReactNode {
  const { control, locales } = useMessagesForm();
  const { errors } = useFormState({ control });

  const hasErrors = useCallback(
    (key: string) => {
      return locales.some(
        (locale) => get(errors, [locale, path, key].join('.')) !== undefined,
      );
    },
    [errors, locales, path],
  );

  return (
    <div className={cn('grid gap-6', className)}>
      {Object.entries(schema).map(([key, value]) => (
        <div
          className="grid min-w-0"
          key={key}
          style={
            {
              ['--nesting-level']: nestingLevel,
            } as React.CSSProperties
          }
        >
          <Collapsible
            className="messages-tree-collapsible min-w-0"
            header={
              <span
                className={cn('text-xl', {
                  'text-error': hasErrors(key),
                })}
              >
                {toWords(key)}
              </span>
            }
          >
            {typeof value === 'string' ? (
              <MessageField
                className="min-w-0"
                key={key}
                messageKey={key}
                path={path}
                schema={value}
              />
            ) : (
              <MessagesTree
                nestingLevel={nestingLevel + 1}
                path={[path, key].join('.')}
                schema={value}
              />
            )}
          </Collapsible>
        </div>
      ))}
    </div>
  );
}
