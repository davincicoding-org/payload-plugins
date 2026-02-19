import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { SelectElement } from '@/types';

import { parseICUMessage, serializeICUMessage } from '@/utils/icu-tranform';

import styles from './SelectVariableEditor.module.css';

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
    <div className={styles.root}>
      {fields.map((field, index) => (
        <div className={styles.field} key={field.name}>
          <label className={styles.label} htmlFor={`options.${index}.content`}>
            {field.name}
          </label>
          {/* // TODO add support for variable mentions */}
          <input
            className={styles.input}
            {...register(`options.${index}.content`)}
          />
        </div>
      ))}
    </div>
  );
}
