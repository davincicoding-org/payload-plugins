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
import {
  BeautifulMentionNode,
  BeautifulMentionsPlugin,
} from 'lexical-beautiful-mentions';
import { useCallback, useEffect, useMemo } from 'react';
import { formatVariableLabel } from '@/components/input/utils';
import {
  isTagElement,
  parseIcuToLexicalState,
  serializeICUMessage,
} from '@/icu';
import type { TemplateVariable } from '@/types';

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

export interface MessageInputProps {
  value: string;
  variables: TemplateVariable[];
  onChange: (value: string) => void;
  onBlur: () => void;
  readOnly?: boolean;
  multiline?: boolean;
  error?: boolean;
}

export function MessageInput({
  value,
  variables,
  onChange,
  onBlur,
  multiline,
  error,
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
    <LexicalComposer initialConfig={initialConfig}>
      <div className={styles.editor} data-multiline={multiline}>
        <PlainTextPlugin
          contentEditable={
            <ContentEditable
              className={styles.contentEditable}
              data-error={error}
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
  );
}
