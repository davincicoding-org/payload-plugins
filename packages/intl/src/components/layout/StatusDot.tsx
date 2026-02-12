import clsx from 'clsx';
import styles from './StatusDot.module.css';

type TranslationStatus = 'translated' | 'missing';

interface StatusDotProps {
  status: TranslationStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span
      aria-label={
        status === 'translated' ? 'Translated' : 'Missing translation'
      }
      className={clsx(
        styles.dot,
        status === 'translated' ? styles.translated : styles.missing,
      )}
      role="img"
    />
  );
}
