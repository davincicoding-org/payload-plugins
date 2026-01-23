import { FieldLabel } from '@payloadcms/ui';
import type { FieldError } from 'react-hook-form';

import { cn } from '@/utils/cn';

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
    <div className={cn('flex h-full min-w-5 flex-col gap-1', className)}>
      <fieldset
        className={cn(
          'mx-0 flex-1 rounded-md focus-within:border-elevation-400',
          {
            'border-error bg-error': error,
          },
        )}
      >
        {label && (
          <legend className="-ml-2 px-1.5 text-base">
            <FieldLabel label={label} />
          </legend>
        )}
        {children}
      </fieldset>
      <p className="text-base text-error">{error?.message}</p>
    </div>
  );
}
