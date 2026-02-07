'use client';

import type { EditorState } from '@payloadcms/richtext-lexical/lexical';
import { $getRoot } from '@payloadcms/richtext-lexical/lexical';
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer';
import { ContentEditable } from '@payloadcms/richtext-lexical/lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@payloadcms/richtext-lexical/lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalPlainTextPlugin';
import {
  BeautifulMentionNode,
  type BeautifulMentionsMenuItemProps,
  type BeautifulMentionsMenuProps,
  BeautifulMentionsPlugin,
} from 'lexical-beautiful-mentions';
import { forwardRef, useCallback, useMemo } from 'react';
import type { TemplateVariable } from '@/types';

import { formatVariableLabel } from '@/utils/format';
import { isTagElement } from '@/utils/guards';
import {
  parseIcuToLexicalState,
  serializeICUMessage,
} from '@/utils/icu-tranform';

import type { InputWrapperProps } from './InputWrapper';
import { InputWrapper } from './InputWrapper';
import styles from './MessageInput.module.css';
import { VariableMentionNode } from './variables/VariableNode';
import suggestionStyles from './variables/VariableSuggestion.module.css';

export interface MessageInputProps extends InputWrapperProps {
  value: string;
  lang: string;
  variables: TemplateVariable[];
  onChange: (value: string) => void;
  onBlur: () => void;
}

const MentionMenu = forwardRef<HTMLUListElement, BeautifulMentionsMenuProps>(
  ({ loading: _, ...props }, ref) => (
    <ul {...props} className={suggestionStyles.list} ref={ref} />
  ),
);

const MentionMenuItem = forwardRef<
  HTMLLIElement,
  BeautifulMentionsMenuItemProps
>((props, ref) => (
  <li
    aria-selected={props.selected}
    className={[
      suggestionStyles.item,
      props.selected ? suggestionStyles.itemSelected : undefined,
    ]
      .filter(Boolean)
      .join(' ')}
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

// TODO add variable editor (style, options, etc)
// TODO add tooltip to show all variables

export function MessageInput({
  label,
  value,
  lang,
  error,
  variables,
  onChange,
  onBlur,
  className,
}: MessageInputProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        onChange($getRoot().getTextContent());
      });
    },
    [onChange],
  );

  const mentionItems = useMemo(() => {
    const toItem = (v: TemplateVariable) => ({
      value: v.value,
      label: formatVariableLabel(v),
      icu: serializeICUMessage([v]),
    });

    return {
      '@': variables.map(toItem),
      '{': variables.filter((v) => !isTagElement(v)).map(toItem),
      '<': variables.filter((v) => isTagElement(v)).map(toItem),
    };
  }, [variables]);

  const initialConfig = {
    namespace: 'ICUMessageEditor',
    nodes: [
      VariableMentionNode,
      {
        replace: BeautifulMentionNode,
        with: (node: BeautifulMentionNode) =>
          new VariableMentionNode(
            node.getTrigger(),
            node.getValue(),
            node.getData(),
          ),
      },
    ],
    editorState: JSON.stringify(parseIcuToLexicalState(value)),
    onError: console.error,
  };

  return (
    <InputWrapper className={className} error={error} label={label}>
      <LexicalComposer initialConfig={initialConfig}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: onBlur captures focus-leave from the Lexical contentEditable */}
        <div className={styles.editor} lang={lang} onBlur={onBlur}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable className={styles.contentEditable} />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={handleChange} />
          <HistoryPlugin />
          <BeautifulMentionsPlugin
            items={mentionItems}
            menuAnchorClassName={styles.menuAnchor}
            menuComponent={MentionMenu}
            menuItemComponent={MentionMenuItem}
          />
        </div>
      </LexicalComposer>
    </InputWrapper>
  );
}
