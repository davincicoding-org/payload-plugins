import { ToggleGroup } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import type { NumberElement, PluralElement } from '@/types';

import { isNumberElement, isPluralElement } from '@/utils/guards';

import { PluralVariableEditor } from '../editors/PluralVariableEditor';
import styles from './NumericVariablePicker.module.css';

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
    <div>
      <ToggleGroup.Root
        className={styles.toggleGroup}
        onValueChange={(value) => setType(value as NumericType)}
        type="single"
        value={type}
      >
        {NUMERIC_TYPES.map((type) => (
          <ToggleGroup.Item
            className={styles.toggleItem}
            key={type}
            value={type}
          >
            {type}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <div className={styles.content}>
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
