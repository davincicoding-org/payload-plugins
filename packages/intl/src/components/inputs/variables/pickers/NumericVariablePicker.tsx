import { ToggleGroup } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import type { NumberElement, PluralElement } from '@/types';

import { isNumberElement, isPluralElement } from '@/utils/guards';

import { PluralVariableEditor } from '../editors/PluralVariableEditor';

const NUMERIC_TYPES = [
  'number',
  'plural',
  // "selectordinal"
] as const;

type NumericType = (typeof NUMERIC_TYPES)[number];

export interface NumericVariablePickerProps {
  element: NumberElement | PluralElement;
  onUpdate: (value: string) => void;
}

export function NumericVariablePicker({
  element,
  onUpdate,
}: NumericVariablePickerProps) {
  const [type, setType] = useState<NumericType | undefined>(() => {
    if (isNumberElement(element)) return 'number';
    if (isPluralElement(element)) return 'plural';
    return undefined;
  });
  const getValueRef = useRef<{ getValue: () => string }>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: useEffectEvent
  useEffect(() => {
    return () => {
      if (!getValueRef.current) return;
      onUpdate(getValueRef.current.getValue());
    };
  }, []);

  return (
    <div className="">
      <ToggleGroup.Root
        className="flex bg-elevation-100"
        onValueChange={(value) => setType(value as NumericType)}
        type="single"
        value={type}
      >
        {NUMERIC_TYPES.map((type) => (
          <ToggleGroup.Item
            className="flex-1 border-none data-[state=off]:cursor-pointer data-[state=on]:bg-elevation-800 data-[state=on]:text-elevation-0 data-[state=off]:opacity-50 data-[state=off]:hover:opacity-100"
            key={type}
            value={type}
          >
            {type}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className="p-3">
        {type === 'plural' && (
          <PluralVariableEditor
            element={isPluralElement(element) ? element : undefined}
            ref={getValueRef}
            variableName={element.value}
          />
        )}
      </div>
    </div>
  );
}
