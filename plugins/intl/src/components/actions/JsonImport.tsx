import { Button } from '@payloadcms/ui';
import { IconBraces } from '@tabler/icons-react';
import { useRef } from 'react';

import { useMessagesForm } from '@/components/MessagesFormProvider';

import styles from './JsonImport.module.css';

export interface JsonImportProps {
  activeLocale: string;
}
export function JsonImport({ activeLocale }: JsonImportProps) {
  const { setValue } = useMessagesForm();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const text = readerEvent.target?.result as string;
      const data = JSON.parse(text);
      setValue(activeLocale, data, {
        shouldDirty: true,
        shouldValidate: true,
      });
      // Clear the input value to allow re-selection of the same or different file
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        accept=".json"
        hidden
        onChange={handleImportJSON}
        ref={inputRef}
        type="file"
      />
      <Button
        buttonStyle="subtle"
        className={styles.button}
        icon={<IconBraces className={styles.icon} />}
        iconPosition="left"
        onClick={() => inputRef.current?.click()}
      >
        Import
      </Button>
    </>
  );
}
