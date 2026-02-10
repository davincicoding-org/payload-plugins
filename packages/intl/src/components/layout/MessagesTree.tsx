import { Collapsible } from '@payloadcms/ui';
import { get } from 'lodash-es';
import { useCallback } from 'react';
import { useFormState } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessageFormContext';
import type { Messages } from '@/types';
import { toWords } from '@/utils/format';

import { MessageField } from './MessageField';
import styles from './MessagesTree.module.css';

interface MessagesTreeProps {
  path: string;
  nestingLevel: number;
  schema: Messages;
  className?: string;
  hidden?: boolean;
}

// TODO fix sticky position on single locale form

export function MessagesTree({
  path,
  schema,
  nestingLevel = 0,
  className,
  hidden,
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
    <div
      className={[styles.grid, className].filter(Boolean).join(' ')}
      style={{ display: hidden ? 'none' : undefined }}
    >
      {Object.entries(schema).map(([key, value]) => (
        <div
          className={styles.item}
          key={key}
          style={
            {
              ['--nesting-level']: nestingLevel,
            } as React.CSSProperties
          }
        >
          <Collapsible
            className={styles.collapsible}
            header={
              <span
                className={[
                  styles.header,
                  hasErrors(key) ? styles.headerError : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {toWords(key)}
              </span>
            }
          >
            {typeof value === 'string' ? (
              <MessageField
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
