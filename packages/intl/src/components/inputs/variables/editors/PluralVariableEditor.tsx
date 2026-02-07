import { TYPE } from '@formatjs/icu-messageformat-parser';
import { IconX } from '@tabler/icons-react';
import { Popover } from 'radix-ui';
import { Fragment, useImperativeHandle, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import type { PluralElement } from '@/types';

import { parseICUMessage, serializeICUMessage } from '@/utils/icu-tranform';

import styles from './PluralVariableEditor.module.css';

const NAMED_PLURAL_OPTIONS = ['zero', 'one', 'two', 'few', 'many'] as const;

export interface PluralVariableEditorProps {
  variableName: string;
  element: PluralElement | undefined;
  ref: React.Ref<{ getValue: () => string }>;
}

// TODO add support for selectordinal ("pluralType": "ordinal")

export function PluralVariableEditor({
  variableName,
  element,
  ref,
}: PluralVariableEditorProps) {
  const config = useMemo<{
    offset: number;
    options: { name: string; content: string }[];
    other: string;
  }>(() => {
    const { other, ...options } = element?.options ?? {};
    return {
      offset: element?.offset ?? 0,
      options: Object.entries(options).map(([name, option]) => ({
        name,
        content: serializeICUMessage(option.value),
      })),
      other: serializeICUMessage(other ? other.value : []),
    };
  }, [element]);

  const { control, register, getValues } = useForm<{
    offset: number;
    options: { name: string; content: string }[];
    other: string;
    customValue?: number;
  }>({
    defaultValues: config,
  });

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const values = getValues();
      const updatedElement: PluralElement = {
        type: TYPE.plural,
        value: variableName,
        offset: values.offset,
        pluralType: element?.pluralType ?? 'cardinal',
        options: Object.fromEntries(
          values.options.map(({ name, content }) => [
            name,
            { value: parseICUMessage(content) },
          ]),
        ),
      };
      return serializeICUMessage([updatedElement]);
    },
  }));

  const options = useFieldArray({
    control,
    name: 'options',
  });

  return (
    <div className={styles.root}>
      <fieldset className={styles.optionsFieldset}>
        <legend>Options</legend>
        {options.fields.map((field, index) => (
          <Fragment key={field.id}>
            <label htmlFor={`options.${index}`}>{field.name}</label>
            {/* // TODO add support for variable mentions */}
            <input
              className={styles.input}
              type="text"
              {...register(`options.${index}.content`, { required: true })}
            />
            <button
              className={styles.removeButton}
              onClick={() => options.remove(index)}
              type="button"
            >
              <IconX size={16} />
            </button>
          </Fragment>
        ))}

        <>
          <label htmlFor="other">other</label>
          {/* // TODO add support for variable mentions */}
          <input
            className={styles.inputSpan2}
            type="text"
            {...register('other', { required: true })}
          />
        </>
      </fieldset>
      <div className={styles.controlsGrid}>
        <label className={styles.offsetLabel}>
          offset
          <input
            className={styles.offsetInput}
            placeholder="0"
            type="numeric"
            {...register('offset')}
          />
        </label>
        <Popover.Root>
          <Popover.Trigger>Add Option</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className={styles.popoverContent} sideOffset={4}>
              <div className={styles.optionsList}>
                {NAMED_PLURAL_OPTIONS.filter((option) =>
                  options.fields.every((field) => field.name !== option),
                ).map((option) => (
                  <Popover.Close
                    className={styles.optionItem}
                    key={option}
                    onClick={() => {
                      // TODO ensure the fields are always in the same order as staticPluralOptions
                      options.append(
                        {
                          name: option,
                          content: '',
                        },
                        {
                          shouldFocus: true,
                        },
                      );
                    }}
                  >
                    {option}
                  </Popover.Close>
                ))}
              </div>

              <div className={styles.customInputGroup}>
                <label htmlFor="customValue">custom</label>
                <Controller
                  control={control}
                  name="customValue"
                  render={({ field }) => (
                    <input
                      className={styles.customInput}
                      min={0}
                      onChange={({ currentTarget: { value } }) => {
                        const number = Number(value);
                        if (isNaN(number)) return;
                        if (number < 0) return;
                        field.onChange(number);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        if (field.value === undefined) return;
                        const isUnique = !options.fields.some(
                          (existingField) =>
                            existingField.name === `=${field.value}`,
                        );
                        if (!isUnique) return; // TODO maybe show error?
                        options.append(
                          {
                            name: `=${field.value}`,
                            content: '',
                          },
                          {
                            shouldFocus: true,
                          },
                        );
                        field.onChange(undefined);
                      }}
                      placeholder="=0"
                      type="numeric"
                      value={field.value ?? ''}
                    />
                  )}
                />
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}
