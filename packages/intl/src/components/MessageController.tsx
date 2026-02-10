import { Controller } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessageFormContext';
import type { TemplateVariable } from '@/types';
import type { MessageValidator } from '@/utils/validate';

import { MessageInput } from './inputs/MessageInput';

interface MessageControllerProps {
  label?: string;
  locale: string;
  name: string;
  className?: string;
  variables: TemplateVariable[];
  validate: MessageValidator;
}

export function MessageController({
  name,
  variables,
  label,
  locale,
  validate,
  className,
}: MessageControllerProps): React.ReactNode {
  const { control } = useMessagesForm();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <MessageInput
          className={className}
          error={fieldState.error}
          label={label}
          lang={locale}
          onBlur={field.onBlur}
          onChange={field.onChange}
          value={(field.value as unknown as string) || ''}
          variables={variables}
        />
      )}
      rules={{
        required: true,
        validate,
      }}
    />
  );
}
