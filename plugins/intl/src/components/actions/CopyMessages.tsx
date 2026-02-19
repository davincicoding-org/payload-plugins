import { Button } from '@payloadcms/ui';
import { IconBraces } from '@tabler/icons-react';
import { get } from 'lodash-es';

import { useMessagesForm } from '@/components/MessagesFormProvider';

import styles from './CopyMessages.module.css';

export function CopyMessages() {
  const { getValues, setValue, locales } = useMessagesForm();
  const handleCopy = () => {
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
      className={styles.button}
      icon={<IconBraces className={styles.icon} />}
      iconPosition="left"
      onClick={handleCopy}
    >
      Copy
    </Button>
  );
}
