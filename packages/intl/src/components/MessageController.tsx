import { Controller } from 'react-hook-form';
import { useMessagesForm } from '@/context/messages-form';
import type { TemplateVariable } from '@/types';
import type { MessageType } from '@/utils/schema';
import type { MessageValidator } from '@/utils/validate';

import { MessageInput } from './inputs/MessageInput';

interface MessageControllerProps {
  type: MessageType;
  label?: string;
  locale: string;
  name: string;
  className?: string;
  variables: TemplateVariable[];
  validate: MessageValidator;
}

export function MessageController({
  type,
  name,
  variables,
  label,
  locale,
  validate,
  className,
}: MessageControllerProps): React.ReactNode {
  const { control } = useMessagesForm();

  // if (type === "rich") {
  //   return (
  //     <Controller
  //       control={control}
  //       name={name}
  //       render={({ field, fieldState }) => (
  //         <LexicalInput
  //           className={className}
  //           error={fieldState.error}
  //           label={label}
  //           lang={locale}
  //           onChange={field.onChange}
  //           onBlur={field.onBlur}
  //           value={(field.value as unknown as string) || ""}
  //         />
  //       )}
  //       rules={{
  //         required: true,
  //       }}
  //     />
  //   );
  // }

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
