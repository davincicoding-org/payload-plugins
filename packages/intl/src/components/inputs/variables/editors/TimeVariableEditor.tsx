import { useImperativeHandle } from 'react';
import type { TimeElement } from '@/types';

export interface TimeElementEditorProps {
  name: string;
  element: TimeElement | undefined;
  ref: React.Ref<{ getValue: () => string }>;
}

export function TimeElementEditor({
  name,
  element,
  ref,
}: TimeElementEditorProps) {
  useImperativeHandle(ref, () => ({
    getValue: () => {
      // TODO
      return '';
    },
  }));

  return <>TimeElementEditor</>;
}
