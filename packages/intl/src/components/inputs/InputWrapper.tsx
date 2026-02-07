import { FieldLabel } from '@payloadcms/ui';
import type { FieldError } from 'react-hook-form';

import styles from './InputWrapper.module.css';

export interface InputWrapperProps {
  label?: string;
  error: FieldError | undefined;
  className?: string;
}

export function InputWrapper({
  label,
  error,
  className,
  children,
}: React.PropsWithChildren<InputWrapperProps>) {
  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <fieldset
        className={[styles.fieldset, error ? styles.fieldsetError : undefined]
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <legend className={styles.legend}>
            <FieldLabel label={label} />
          </legend>
        )}
        {children}
      </fieldset>
      <p className={styles.errorMessage}>{error?.message}</p>
    </div>
  );
}
