import { Button } from '@payloadcms/ui';
import { IconBraces } from '@tabler/icons-react';
import { get } from 'lodash-es';

import { useMessagesForm } from '@/components/MessageFormContext';

import styles from './Move.module.css';

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
      className={styles.button}
      icon={<IconBraces className={styles.icon} />}
      iconPosition="left"
      onClick={handleMove}
    >
      Copy
    </Button>
  );
}
