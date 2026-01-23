import { TYPE } from '@formatjs/icu-messageformat-parser';
import { IconX } from '@tabler/icons-react';
import { Popover } from 'radix-ui';
import { Fragment, useImperativeHandle, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import type { PluralElement } from '@/types';

import { cn } from '@/utils/cn';
import { parseICUMessage, serializeICUMessage } from '@/utils/icu-tranform';

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
    <div className="flex flex-col gap-3">
      <fieldset className="mx-0 grid grid-cols-[3rem_8rem_1.5rem] gap-y-2 rounded-md border border-border px-2 pr-0">
        <legend>Options</legend>
        {options.fields.map((field, index) => (
          <Fragment key={field.id}>
            <label htmlFor={`options.${index}`}>{field.name}</label>
            {/* // TODO add support for variable mentions */}
            <input
              className="focus:outline-none"
              type="text"
              {...register(`options.${index}.content`, { required: true })}
            />
            <button
              className="ml-auto flex cursor-pointer items-center justify-center border-none bg-transparent p-0 hover:text-error"
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
            className="col-span-2 focus:outline-none"
            type="text"
            {...register('other', { required: true })}
          />
        </>
      </fieldset>
      <div className="grid grid-cols-2 items-center gap-2">
        <label className="flex items-center gap-3 pl-2">
          offset
          <input
            className="w-8 text-center"
            placeholder="0"
            type="numeric"
            {...register('offset')}
          />
        </label>
        <Popover.Root>
          <Popover.Trigger>Add Option</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overflow-x-hidden rounded-md border border-border bg-elevation-50 shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in"
              sideOffset={4}
            >
              <div className="flex flex-col">
                {NAMED_PLURAL_OPTIONS.filter((option) =>
                  options.fields.every((field) => field.name !== option),
                ).map((option) => (
                  <Popover.Close
                    className={cn(
                      'cursor-pointer border-none bg-transparent px-1 hover:bg-elevation-250',
                    )}
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

              <div className="flex items-center justify-between gap-2 border-border border-t p-2">
                <label htmlFor="customValue">custom</label>
                <Controller
                  control={control}
                  name="customValue"
                  render={({ field }) => (
                    <input
                      className="w-8 rounded-sm border-transparent text-center focus:border-border focus:outline-none"
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
