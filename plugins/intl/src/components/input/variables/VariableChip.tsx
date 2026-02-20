'use client';

import { Popover } from '@base-ui/react/popover';
import type { NodeKey } from '@payloadcms/richtext-lexical/lexical';
import { $getNodeByKey } from '@payloadcms/richtext-lexical/lexical';
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext';
import clsx from 'clsx';
import type { BeautifulMentionNode } from 'lexical-beautiful-mentions';
import { useMemo } from 'react';

import {
  isArgumentElement,
  isNumericElement,
  isSelectElement,
  isTagElement,
  isTemporalElement,
  parseICUMessage,
} from '@/icu';

import { SelectVariableEditor } from './editors/SelectVariableEditor';
import { TagVariableEditor } from './editors/TagVariableEditor';
import { NumericVariableEditor } from './pickers/NumericVariableEditor';
import { TemporalVariablePicker } from './pickers/TemporalVariablePicker';
import styles from './VariableChip.module.css';

const TEMPORAL_ELEMENTS_FLAG = false;

export interface VariableChipProps {
  name: string;
  label: string;
  icu: string;
  nodeKey: NodeKey;
}

// TODO replace popover with portal below input field

export function VariableChip({ name, label, icu, nodeKey }: VariableChipProps) {
  const [editor] = useLexicalComposerContext();

  const handleUpdate = (value: string) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey) as BeautifulMentionNode | null;
      if (node) {
        node.setData({ ...node.getData(), icu: value });
      }
    });
  };

  const element = useMemo(() => {
    try {
      const [part] = parseICUMessage(icu);
      if (!part) throw new Error('No part found');
      return part;
    } catch (error) {
      console.error(error);
      throw new Error(`Invalid ICU: ${icu}`, { cause: error });
    }
  }, [icu]);

  const isDisabled =
    isArgumentElement(element) ||
    (isTemporalElement(element) && !TEMPORAL_ELEMENTS_FLAG);

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            className={clsx(styles.chip, isDisabled && styles.chipDisabled)}
            data-icu={icu}
            data-variable={name}
            type="button"
          />
        }
      >
        {/* <VariableIcon type={element.type} className="size-4" /> */}
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" side="bottom" sideOffset={5}>
          <Popover.Popup className={styles.popoverContent}>
            {isNumericElement(element) && (
              <NumericVariableEditor
                element={element}
                onUpdate={handleUpdate}
              />
            )}
            {isSelectElement(element) && (
              <SelectVariableEditor element={element} onUpdate={handleUpdate} />
            )}
            {TEMPORAL_ELEMENTS_FLAG && isTemporalElement(element) && (
              <TemporalVariablePicker
                element={element}
                onUpdate={handleUpdate}
              />
            )}

            {isTagElement(element) && (
              <TagVariableEditor element={element} onUpdate={handleUpdate} />
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
