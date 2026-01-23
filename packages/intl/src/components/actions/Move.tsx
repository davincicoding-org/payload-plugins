import { Button } from '@payloadcms/ui';
import { IconBraces } from '@tabler/icons-react';
import { get } from 'lodash-es';

import { useMessagesForm } from '@/context/messages-form';

export function Move() {
  const { getValues, setValue, locales } = useMessagesForm();
  const handleMove = () => {
    const sourcePath = prompt('Source path');
    if (!sourcePath) {
      return;
    }
    const targetPath = prompt('Target path');
    if (!targetPath) {
      return;
    }

    locales.forEach((locale) => {
      const sourceValue = get(getValues(), [locale, sourcePath].join('.'));
      setValue([locale, targetPath].join('.'), sourceValue);
    });
  };
  return (
    <Button
      buttonStyle="subtle"
      className="my-0"
      icon={<IconBraces className="size-5" />}
      iconPosition="left"
      onClick={handleMove}
    >
      Copy
    </Button>
  );
}
