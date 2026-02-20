import { useImperativeHandle } from 'react';
import type { DateElement, TimeElement } from '@/types';

export interface TemporalVariableEditorProps {
  type: 'date' | 'time';
  name: string;
  element: DateElement | TimeElement | undefined;
  ref: React.Ref<{ getValue: () => string }>;
}

export function TemporalVariableEditor({
  type,
  ref,
}: TemporalVariableEditorProps) {
  useImperativeHandle(ref, () => ({
    getValue: () => {
      // TODO
      return '';
    },
  }));

  return <>{type === 'date' ? 'DateElementEditor' : 'TimeElementEditor'}</>;
}
