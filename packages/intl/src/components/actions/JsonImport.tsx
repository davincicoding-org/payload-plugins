import { Button } from '@payloadcms/ui';
import { IconBraces } from '@tabler/icons-react';
import { useRef, useState } from 'react';

import { useMessagesForm } from '@/context/messages-form';

export function JsonImport() {
  const { locales, setValue } = useMessagesForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedLocale, setSelectedLocale] = useState<string>();

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!selectedLocale || !file) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const text = readerEvent.target?.result as string;
      const data = JSON.parse(text);
      // FIMXE this does not cause the form to re-render
      setValue(selectedLocale, data, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setSelectedLocale(undefined);
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
        className="my-0"
        icon={<IconBraces className="size-5" />}
        iconPosition="left"
        SubMenuPopupContent={({ close }) => (
          <div className="flex flex-col gap-2">
            {locales.map((locale) => (
              <Button
                buttonStyle="subtle"
                key={locale}
                onClick={() => {
                  setSelectedLocale(locale);
                  inputRef.current?.click();
                  close();
                }}
                size="small"
              >
                {locale}.json
              </Button>
            ))}
          </div>
        )}
      >
        Import
      </Button>
    </>
  );
}
