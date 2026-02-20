import { Popover } from '@base-ui/react/popover';

import { IconX } from '@tabler/icons-react';
import {
  cloneElement,
  type ReactElement,
  useCallback,
  useRef,
  useState,
} from 'react';

import styles from './ReferencePopover.module.css';

export interface ReferencePopoverProps {
  reference?: string;
  children: ReactElement;
}

export function ReferencePopover({
  reference,
  children,
}: ReferencePopoverProps) {
  if (!reference) return children;

  return (
    <ControlledReferencePopover reference={reference}>
      {children}
    </ControlledReferencePopover>
  );
}

function ControlledReferencePopover({
  reference,
  children,
}: {
  reference: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement>(null);

  const handleFocus = useCallback(() => setOpen(true), []);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Stay open if focus moves within the fieldset or into the popup
    if (
      anchorRef.current?.contains(e.relatedTarget) ||
      e.relatedTarget?.closest('[data-popup-open]')
    )
      return;
    setOpen(false);
  }, []);

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          anchor={anchorRef}
          side="top"
          sideOffset={4}
        >
          <Popover.Popup
            className={styles.popup}
            initialFocus={false}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Popover.Close className={styles.dismiss} type="button">
              <IconX size={14} />
            </Popover.Close>
            <p className={styles.text}>{reference}</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
      {children}
      {/*{cloneElement(children, {
        ref: anchorRef,
        onFocus: handleFocus,
        onBlur: handleBlur,
      })}*/}
    </Popover.Root>
  );
}
