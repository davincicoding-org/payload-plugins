import { ToggleGroup } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import type { DateElement, TimeElement } from '@/types';

import { isDateElement, isTimeElement } from '@/utils/guards';

import { DateVariableEditor } from '../editors/DateVariableEditor';
import { TimeElementEditor } from '../editors/TimeVariableEditor';

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
    <div className="">
      <ToggleGroup.Root
        className="flex bg-elevation-100"
        onValueChange={(value) => setType(value as TemporalType)}
        type="single"
        value={type}
      >
        {TEMPORAL_TYPES.map((type) => (
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
