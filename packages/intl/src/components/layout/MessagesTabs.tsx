import { Button } from '@payloadcms/ui';
import { get } from 'lodash-es';
import { useCallback } from 'react';
import { useFormState } from 'react-hook-form';
import { useMessagesForm } from '@/context/messages-form';
import type { MessagesSchema } from '@/types';
import { cn } from '@/utils/cn';
import { toWords } from '@/utils/format';

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
    <div
      className="overflow-x-auto text-nowrap border-border border-b-2 px-4"
      role="tablist"
    >
      {Object.keys(schema).map((key) => (
        <Button
          buttonStyle={activeTab === key ? 'pill' : 'tab'}
          className={cn(
            'my-0 rounded-b-none text-lg',
            hasErrors(key)
              ? activeTab === key
                ? 'bg-error'
                : 'text-error'
              : undefined,
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
