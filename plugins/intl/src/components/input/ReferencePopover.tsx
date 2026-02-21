import { Popover } from '@base-ui/react/popover';

import { IconX } from '@tabler/icons-react';
import { type ReactElement, useRef } from 'react';

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
  const anchorRef = useRef<HTMLElement>(null);

  return (
    <Popover.Root>
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
    </Popover.Root>
  );
}
