import { Button } from '@payloadcms/ui';
import clsx from 'clsx';
import { get } from 'lodash-es';
import { useCallback } from 'react';
import { useFormState } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessagesFormProvider';
import type { MessagesSchema } from '@/types';
import { toWords } from '@/utils/format';
import styles from './MessagesTabs.module.css';

interface MessagesTabsProps {
  schema: MessagesSchema;
  activeTab: string | undefined;
  setActiveTab: (tab: string) => void;
}

// TODO add hash for current tab to url
export function MessagesTabs({
  schema,
  activeTab,
  setActiveTab,
}: MessagesTabsProps): React.ReactNode {
  const { locales, control } = useMessagesForm();
  const { errors } = useFormState({ control });

  const hasErrors = useCallback(
    (key: string) => {
      return locales.some((locale) => get(errors, [locale, key]) !== undefined);
    },
    [errors, locales],
  );

  return (
    <div className={styles.tabs} role="tablist">
      {Object.keys(schema).map((key) => (
        <Button
          buttonStyle={activeTab === key ? 'pill' : 'tab'}
          className={clsx(
            styles.tab,
            hasErrors(key) && activeTab === key && styles.tabError,
            hasErrors(key) && activeTab !== key && styles.tabErrorInactive,
          )}
          key={key}
          onClick={() => setActiveTab(key)}
          size="large"
          type="button"
        >
          {toWords(key)}
        </Button>
      ))}
    </div>
  );
}
