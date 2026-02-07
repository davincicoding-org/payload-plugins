import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Popover } from 'radix-ui';
import { useMemo } from 'react';
import type { VariableMentionNodeAttrs } from '@/types';

import {
  isArgumentElement,
  isNumericElement,
  isSelectElement,
  isTagElement,
  isTemporalElement,
} from '@/utils/guards';
import { parseICUMessage } from '@/utils/icu-tranform';

import { SelectVariableEditor } from './editors/SelectVariableEditor';
import { TagVariableEditor } from './editors/TagVariableEditor';
import { NumericVariablePicker } from './pickers/NumericVariablePicker';
import { TemporalElementEditor } from './pickers/TemporalElementEditor';
import styles from './VariableChip.module.css';

const TEMPORAL_ELEMENTS_FLAG = false;

// TODO replace popover with portal below input field

export function VariableChip({
  node,
  updateAttributes,
}: ReactNodeViewProps<HTMLElement>) {
  const attrs = node.attrs as VariableMentionNodeAttrs;
  const handleUpdate = (value: string) =>
    updateAttributes({
      icu: value,
    });

  const element = useMemo(() => {
    try {
      const [part] = parseICUMessage(attrs.icu);
      if (!part) throw new Error('No part found');
      return part;
    } catch (error) {
      console.error(error);
      throw new Error(`Invalid ICU: ${attrs.icu}`, { cause: error });
    }
  }, [attrs.icu]);

  const isDisabled =
    isArgumentElement(element) ||
    (isTemporalElement(element) && !TEMPORAL_ELEMENTS_FLAG);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <NodeViewWrapper
          as="span"
          className={[styles.chip, isDisabled ? styles.chipDisabled : undefined]
            .filter(Boolean)
            .join(' ')}
          contentEditable={false}
          data-icu={attrs.icu}
          data-variable={attrs.name}
          role="button"
          tabIndex={0}
        >
          {/* <VariableIcon type={element.type} className="size-4" /> */}
          {attrs.label}
        </NodeViewWrapper>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className={styles.popoverContent}
          side="bottom"
          sideOffset={5}
        >
          {isNumericElement(element) && (
            <NumericVariablePicker element={element} onUpdate={handleUpdate} />
          )}
          {isSelectElement(element) && (
            <SelectVariableEditor element={element} onUpdate={handleUpdate} />
          )}
          {TEMPORAL_ELEMENTS_FLAG && isTemporalElement(element) && (
            <TemporalElementEditor element={element} onUpdate={handleUpdate} />
          )}

          {isTagElement(element) && (
            <TagVariableEditor element={element} onUpdate={handleUpdate} />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
