import { Collapsible } from '@payloadcms/ui';
import clsx from 'clsx';
import { memo } from 'react';
import { useMessagesForm } from '@/components/MessagesFormProvider';
import type { Messages } from '@/types';
import { toWords } from '@/utils/format';

import { GroupStatusDot } from './GroupStatusDot';
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

export const MessagesTree = memo(function MessagesTree({
  path,
  schema,
  nestingLevel = 0,
  className,
  hidden,
}: MessagesTreeProps): React.ReactNode {
  const { activeLocale, defaultLocale } = useMessagesForm();
  const showStatus = activeLocale !== defaultLocale;

  return (
    <div
      className={clsx(styles.grid, className)}
      style={{ display: hidden ? 'none' : undefined }}
    >
      {Object.entries(schema).map(([key, value]) => {
        const fullPath = path ? [path, key].join('.') : key;

        return typeof value === 'string' ? (
          <MessageField
            key={key}
            messageKey={key}
            path={path}
            schema={value}
            showStatus={showStatus}
          />
        ) : (
          <div
            className={styles.item}
            key={key}
            style={
              {
                '--nesting-level': nestingLevel,
              } as React.CSSProperties
            }
          >
            <Collapsible
              className={styles.collapsible}
              header={
                <span className={styles.header}>
                  {toWords(key)}
                  {showStatus && <GroupStatusDot path={fullPath} />}
                </span>
              }
            >
              <MessagesTree
                nestingLevel={nestingLevel + 1}
                path={fullPath}
                schema={value}
              />
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
});
