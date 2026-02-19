import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useEffect, useRef, useState } from 'react';
import type { NumberElement, PluralElement } from '@/types';

import { isNumberElement, isPluralElement } from '@/utils/guards';

import { PluralVariableEditor } from '../editors/PluralVariableEditor';
import styles from './NumericVariableEditor.module.css';

const NUMERIC_TYPES = [
  'number',
  'plural',
  // "selectordinal"
] as const;

type NumericType = (typeof NUMERIC_TYPES)[number];

export interface NumericVariableEditorProps {
  element: NumberElement | PluralElement;
  onUpdate: (value: string) => void;
}

export function NumericVariableEditor({
  element,
  onUpdate,
}: NumericVariableEditorProps) {
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
      <ToggleGroup
        className={styles.toggleGroup}
        onValueChange={(newValue) => {
          if (newValue.length === 0) return;
          const next = newValue.find((v) => v !== type);
          if (next) setType(next as NumericType);
        }}
        value={type ? [type] : []}
      >
        {NUMERIC_TYPES.map((type) => (
          <Toggle className={styles.toggleItem} key={type} value={type}>
            {type}
          </Toggle>
        ))}
      </ToggleGroup>

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
