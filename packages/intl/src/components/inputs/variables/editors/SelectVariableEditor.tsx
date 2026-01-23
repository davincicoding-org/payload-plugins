import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { SelectElement } from '@/types';

import { parseICUMessage, serializeICUMessage } from '@/utils/icu-tranform';

export interface SelectVariableEditorProps {
  element: SelectElement;
  onUpdate: (value: string) => void;
}

export function SelectVariableEditor({
  element,
  onUpdate,
}: SelectVariableEditorProps) {
  const options = useMemo<{ name: string; content: string }[]>(
    () =>
      Object.entries(element.options).map(([name, option]) => ({
        name,
        content: serializeICUMessage(option.value),
      })),
    [element],
  );

  const { control, register, getValues } = useForm<{
    options: { name: string; content: string }[];
  }>({
    defaultValues: { options },
  });
  const { fields } = useFieldArray({
    control,
    name: 'options',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: useEffectEvent
  useEffect(() => {
    return () => {
      const values = getValues();
      const updatedElement: SelectElement = {
        ...element,
        options: Object.fromEntries(
          values.options.map(({ name, content }) => [
            name,
            { value: parseICUMessage(content) },
          ]),
        ),
      };
      onUpdate(serializeICUMessage([updatedElement]));
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3">
      {fields.map((field, index) => (
        <div className="flex flex-col gap-1" key={field.name}>
          <label
            className="font-medium text-sm"
            htmlFor={`options.${index}.content`}
          >
            {field.name}
          </label>
          {/* // TODO add support for variable mentions */}
          <input
            className="focus:outline-none"
            {...register(`options.${index}.content`)}
          />
        </div>
      ))}
    </div>
  );
}
