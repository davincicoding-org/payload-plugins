import { Controller } from 'react-hook-form';
import { useMessagesForm } from '@/components/MessagesFormProvider';
import type { Locale, TemplateVariable } from '@/types';
import type { MessageValidator } from '@/utils/validate';

import { MessageInput } from './inputs/MessageInput';

interface MessageFormFieldProps {
  label?: string;
  locale: Locale;
  name: string;
  className?: string;
  variables: TemplateVariable[];
  validate: MessageValidator;
  multiline?: boolean;
  reference?: string;
}

export function MessageFormField({
  name,
  variables,
  label,
  locale,
  validate,
  className,
  multiline,
  reference,
}: MessageFormFieldProps): React.ReactNode {
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
          multiline={multiline}
          onBlur={field.onBlur}
          onChange={field.onChange}
          reference={reference}
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
