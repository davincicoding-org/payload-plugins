import { Collapsible } from '@payloadcms/ui';
import { memo } from 'react';
import type { Control } from 'react-hook-form';
import { toWords } from '@/components/input/utils';
import type { Messages, MessagesSchema } from '@/types';
import { MessageField } from './MessageField';
import styles from './MessagesTree.module.css';

interface MessagesTreeProps {
  path: string;
  nestingLevel?: number;
  schema: MessagesSchema;
  control: Control<Messages>;
  defaultValues?: Messages | undefined;
  hiddenGroups?: string[];
}

export const MessagesTree = memo(function MessagesTree({
  path,
  schema,
  nestingLevel = 0,
  control,
  defaultValues,
  hiddenGroups = [],
}: MessagesTreeProps): React.ReactNode {
  return (
    <div className={styles.root}>
      {Object.entries(schema).map(([key, value]) => {
        if (hiddenGroups.includes(key)) return null;
        const fullPath = path ? [path, key].join('.') : key;

        return typeof value === 'string' ? (
          <MessageField
            control={control}
            key={key}
            messageKey={key}
            path={path}
            reference={
              typeof defaultValues?.[key] === 'string'
                ? defaultValues[key]
                : undefined
            }
            schema={value}
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
              header={<span className={styles.header}>{toWords(key)}</span>}
            >
              <MessagesTree
                control={control}
                defaultValues={
                  typeof defaultValues?.[key] === 'object'
                    ? defaultValues[key]
                    : undefined
                }
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
