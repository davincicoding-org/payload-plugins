'use client';

import type { EditorState } from '@payloadcms/richtext-lexical/lexical';
import { $getRoot } from '@payloadcms/richtext-lexical/lexical';
import { LexicalComposer } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext';
import { ContentEditable } from '@payloadcms/richtext-lexical/lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@payloadcms/richtext-lexical/lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalOnChangePlugin';
import { PlainTextPlugin } from '@payloadcms/richtext-lexical/lexical/react/LexicalPlainTextPlugin';
import clsx from 'clsx';
import {
  BeautifulMentionNode,
  BeautifulMentionsPlugin,
} from 'lexical-beautiful-mentions';
import { useCallback, useEffect, useMemo } from 'react';
import type { TemplateVariable } from '@/types';

import { formatVariableLabel } from '@/utils/format';
import { isTagElement } from '@/utils/guards';
import {
  parseIcuToLexicalState,
  serializeICUMessage,
} from '@/utils/icu-tranform';

import type { FieldWrapperProps } from './FieldWrapper';
import { FieldWrapper } from './FieldWrapper';
import styles from './MessageInput.module.css';
import { SingleLinePlugin } from './SingleLinePlugin';
import { VariableMentionNode } from './variables/VariableNode';
import { MentionMenu, MentionMenuItem } from './variables/VariableSuggestion';

function SyncValuePlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const currentText = editor
      .getEditorState()
      .read(() => $getRoot().getTextContent());
    if (value !== currentText) {
      queueMicrotask(() => {
        const newState = editor.parseEditorState(
          JSON.stringify(parseIcuToLexicalState(value)),
        );
        editor.setEditorState(newState);
      });
    }
  }, [value, editor]);

  return null;
}

export interface MessageInputProps extends FieldWrapperProps {
  value: string;
  lang: string;
  variables: TemplateVariable[];
  onChange: (value: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
  multiline?: boolean;
  reference?: string;
}

export function MessageInput({
  label,
  value,
  lang,
  error,
  variables,
  onChange,
  onBlur,
  className,
  multiline,
  reference,
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: LexicalComposer only reads initialConfig on mount
  const initialConfig = useMemo(
    () => ({
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
          withKlass: VariableMentionNode,
        },
      ],
      editorState: JSON.stringify(parseIcuToLexicalState(value)),
      editable: true,
      onError: console.error,
    }),
    [],
  );

  return (
    <FieldWrapper
      className={className}
      error={error}
      label={label}
      reference={reference}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <div
          className={clsx(styles.editor, multiline && styles.multiline)}
          lang={lang}
        >
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={clsx(
                  styles.contentEditable,
                  error && styles.contentEditableError,
                )}
                onBlur={onBlur}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {multiline && <SingleLinePlugin />}
          <SyncValuePlugin value={value} />
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
    </FieldWrapper>
  );
}
