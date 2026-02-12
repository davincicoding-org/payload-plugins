import { toast, useDocumentEvents } from '@payloadcms/ui';
import { isEqual } from 'lodash-es';
import type { UseFormReturn } from 'react-hook-form';
import type { FormValues } from '@/components/MessagesFormProvider';
import type { DeepPartial, Messages, Translations } from '@/types';
import { getErrorMessage } from '@/utils/error-handling';

interface UseMessagesFormSubmitOptions {
  endpointUrl: string;
  defaultValues: Translations<DeepPartial<Messages>>;
  form: UseFormReturn<FormValues>;
}

export function useMessagesFormSubmit({
  endpointUrl,
  defaultValues,
  form,
}: UseMessagesFormSubmitOptions) {
  const { reportUpdate } = useDocumentEvents();

  const handleSubmit = async (currentValues: FormValues) => {
    const toastId = toast.loading('Saving...');
    const changes = Object.entries(currentValues).reduce<
      Translations<Messages>
    >((acc, [locale, value]) => {
      const hasChanged = !isEqual(value, defaultValues[locale]);
      if (!hasChanged) return acc;
      acc[locale] = value;
      return acc;
    }, {});

    try {
      const response = await fetch(endpointUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes),
      });

      if (!response.ok) {
        const error = await getErrorMessage(response);
        throw new Error(error);
      }

      form.reset(currentValues);
      reportUpdate({
        entitySlug: 'messages',
        operation: 'update',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Saved', { id: toastId });
    } catch (error) {
      toast.error(
        `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: toastId },
      );
    }
  };

  return handleSubmit;
}
