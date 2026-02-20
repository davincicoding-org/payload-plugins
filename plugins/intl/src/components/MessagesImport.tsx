'use client';

import { Button, Popup, useField } from '@payloadcms/ui';
import { useRef } from 'react';

import styles from './MessagesImport.module.css';

export function MessagesImport() {
  const { setValue } = useField({ path: 'data' });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const text = readerEvent.target?.result as string;
      const data = JSON.parse(text);
      setValue(data);
      // Clear the input value to allow re-selection of the same or different file
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportFromURL = () => {
    const url = prompt('Enter the URL of the JSON file to import:');
    if (!url) return;

    // TODO Validate URL

    fetch(url)
      .then((response) => response.json())
      .then(setValue)
      .catch((error) => console.error('Error importing JSON:', error));
  };

  return (
    <>
      <input
        accept=".json"
        hidden
        onChange={handleImportFromFile}
        ref={inputRef}
        type="file"
      />
      <Popup button="Import">
        <div className={styles.popup}>
          <Button
            buttonStyle="subtle"
            className={styles.action}
            iconPosition="left"
            onClick={() => inputRef.current?.click()}
          >
            Import from File
          </Button>
          <Button
            buttonStyle="subtle"
            className={styles.action}
            iconPosition="left"
            onClick={handleImportFromURL}
          >
            Import from URL
          </Button>
        </div>
      </Popup>
    </>
  );
}
