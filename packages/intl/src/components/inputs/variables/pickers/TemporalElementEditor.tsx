import { ToggleGroup } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import type { DateElement, TimeElement } from '@/types';

import { isDateElement, isTimeElement } from '@/utils/guards';

import { DateVariableEditor } from '../editors/DateVariableEditor';
import { TimeElementEditor } from '../editors/TimeVariableEditor';
import styles from './TemporalElementEditor.module.css';

const TEMPORAL_TYPES = ['date', 'time'] as const;

type TemporalType = (typeof TEMPORAL_TYPES)[number];

export interface TemporalElementEditorProps {
  element: DateElement | TimeElement;
  onUpdate: (value: string) => void;
}

export function TemporalElementEditor({
  element,
  onUpdate,
}: TemporalElementEditorProps) {
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
      <ToggleGroup.Root
        className={styles.toggleGroup}
        onValueChange={(value) => setType(value as TemporalType)}
        type="single"
        value={type}
      >
        {TEMPORAL_TYPES.map((type) => (
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
        {type === 'date' && (
          <DateVariableEditor
            element={isDateElement(element) ? element : undefined}
            name={element.value}
            ref={getValueRef}
          />
        )}
        {type === 'time' && (
          <TimeElementEditor
            element={isTimeElement(element) ? element : undefined}
            name={element.value}
            ref={getValueRef}
          />
        )}
      </div>
    </div>
  );
}
