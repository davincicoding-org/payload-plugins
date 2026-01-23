import type { ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Popover } from 'radix-ui';
import { useMemo } from 'react';
import type { VariableMentionNodeAttrs } from '@/types';

import { cn } from '@/utils/cn';
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
import { VariableIcon } from './VariableIcon';

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

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <NodeViewWrapper
          as="span"
          className={cn(
            'inline-flex cursor-pointer items-center rounded-md bg-elevation-250 px-1 hover:bg-elevation-400',
            {
              'pointer-events-none':
                isArgumentElement(element) ||
                (isTemporalElement(element) && !TEMPORAL_ELEMENTS_FLAG),
            },
          )}
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
          className="data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 grid origin-(--radix-hover-card-content-transform-origin) overflow-clip rounded-md border border-border bg-elevation-50 shadow-md outline-hidden empty:hidden data-[state=closed]:animate-out data-[state=open]:animate-in"
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
