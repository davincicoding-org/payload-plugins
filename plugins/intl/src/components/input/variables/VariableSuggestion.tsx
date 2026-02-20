import clsx from 'clsx';
import type {
  BeautifulMentionsMenuItemProps,
  BeautifulMentionsMenuProps,
} from 'lexical-beautiful-mentions';
import { forwardRef } from 'react';

import styles from './VariableSuggestion.module.css';

export const MentionMenu = forwardRef<
  HTMLUListElement,
  BeautifulMentionsMenuProps
>(({ loading: _, ...props }, ref) => (
  <ul {...props} className={styles.list} ref={ref} />
));

export const MentionMenuItem = forwardRef<
  HTMLLIElement,
  BeautifulMentionsMenuItemProps
>((props, ref) => (
  <li
    aria-selected={props.selected}
    className={clsx(styles.item, props.selected && styles.itemSelected)}
    onClick={props.onClick}
    onKeyDown={props.onKeyDown}
    onMouseDown={props.onMouseDown}
    onMouseEnter={props.onMouseEnter}
    ref={ref}
    // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: standard WAI-ARIA listbox/option pattern
    role="option"
    tabIndex={-1}
  >
    {typeof props.item.data?.label === 'string'
      ? props.item.data.label
      : props.item.displayValue}
  </li>
));
