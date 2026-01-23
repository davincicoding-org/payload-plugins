import { useImperativeHandle } from 'react';
import type { DateElement } from '@/types';

export interface DateVariableEditorProps {
  name: string;
  element: DateElement | undefined;
  ref: React.Ref<{ getValue: () => string }>;
}

export function DateVariableEditor({
  name,
  element,
  ref,
}: DateVariableEditorProps) {
  useImperativeHandle(ref, () => ({
    getValue: () => {
      // TODO
      return '';
    },
  }));

  return <>DateElementEditor</>;
}
