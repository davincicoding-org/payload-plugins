import { FieldLabel } from '@payloadcms/ui';
import clsx from 'clsx';
import type { FieldError } from 'react-hook-form';

import styles from './FieldWrapper.module.css';
import { ReferencePopover } from './ReferencePopover';

export interface FieldWrapperProps {
  label?: string;
  error: FieldError | undefined;
  className?: string;
  reference?: string;
}

export function FieldWrapper({
  label,
  error,
  reference,
  className,
  children,
}: React.PropsWithChildren<FieldWrapperProps>) {
  return (
    <div className={clsx(styles.wrapper, className)}>
      <ReferencePopover reference={reference}>
        <fieldset
          className={clsx(styles.fieldset, error && styles.fieldsetError)}
        >
          {children}
        </fieldset>
      </ReferencePopover>
      {error?.message && <p className={styles.errorMessage}>{error.message}</p>}
    </div>
  );
}
