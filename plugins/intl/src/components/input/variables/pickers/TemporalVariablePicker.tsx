import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useEffect, useRef, useState } from 'react';
import { isDateElement, isTimeElement } from '@/icu';
import type { DateElement, TimeElement } from '@/types';

import { TemporalVariableEditor } from '../editors/TemporalVariableEditor';
import styles from './TemporalVariablePicker.module.css';

const TEMPORAL_TYPES = ['date', 'time'] as const;

type TemporalType = (typeof TEMPORAL_TYPES)[number];

export interface TemporalVariablePickerProps {
  element: DateElement | TimeElement;
  onUpdate: (value: string) => void;
}

export function TemporalVariablePicker({
  element,
  onUpdate,
}: TemporalVariablePickerProps) {
  const [type, setType] = useState<TemporalType | undefined>(() => {
    if (isDateElement(element)) return 'date';
    if (isTimeElement(element)) return 'time';
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
          if (next) setType(next as TemporalType);
        }}
        value={type ? [type] : []}
      >
        {TEMPORAL_TYPES.map((type) => (
          <Toggle className={styles.toggleItem} key={type} value={type}>
            {type}
          </Toggle>
        ))}
      </ToggleGroup>

      <div className={styles.content}>
        {type && (
          <TemporalVariableEditor
            element={
              type === 'date'
                ? isDateElement(element)
                  ? element
                  : undefined
                : isTimeElement(element)
                  ? element
                  : undefined
            }
            name={element.value}
            ref={getValueRef}
            type={type}
          />
        )}
      </div>
    </div>
  );
}
