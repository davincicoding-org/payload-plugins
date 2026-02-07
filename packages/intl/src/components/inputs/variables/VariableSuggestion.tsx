import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from '@tiptap/suggestion';
import { useEffect, useImperativeHandle, useState } from 'react';
import type { VariableMentionNodeAttrs } from '@/types';

import styles from './VariableSuggestion.module.css';

export interface VariableSuggestionProps
  extends SuggestionProps<VariableMentionNodeAttrs, VariableMentionNodeAttrs> {
  ref: React.RefObject<{
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  }>;
}

export function VariableSuggestion({
  items,
  command,
  ref,
}: VariableSuggestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];

    if (item) command(item);
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className={styles.list}>
      {items.map((item, index) => (
        <button
          className={[
            styles.item,
            index === selectedIndex ? styles.itemSelected : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
          key={index}
          onClick={() => selectItem(index)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
