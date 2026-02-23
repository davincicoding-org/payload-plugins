import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { parseICUMessage, serializeICUMessage } from '@/icu';
import type { TagElement } from '@/types';

import styles from './TagVariableEditor.module.css';

export interface TagVariableEditorProps {
  element: TagElement;
  onUpdate: (value: string) => void;
}

export function TagVariableEditor({
  element,
  onUpdate,
}: TagVariableEditorProps) {
  const content = useMemo<string>(
    () => serializeICUMessage(element.children),
    [element],
  );

  const { register, getValues } = useForm<{ content: string }>({
    defaultValues: { content },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: FIXME
  useEffect(() => {
    return () => {
      const { content } = getValues();
      // TODO find better solution for this
      const updatedElement: TagElement = {
        ...element,
        children: parseICUMessage(content),
      };
      onUpdate(serializeICUMessage([updatedElement]));
    };
  }, []);

  // TODO add support for variable mentions
  return (
    <textarea className={styles.textarea} {...register('content')} rows={1} />
  );
}
