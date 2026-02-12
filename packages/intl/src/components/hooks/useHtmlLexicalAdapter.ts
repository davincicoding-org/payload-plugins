import type {
  DefaultNodeTypes,
  TypedEditorState,
} from '@payloadcms/richtext-lexical';
import {
  defaultEditorConfig,
  defaultEditorFeatures,
} from '@payloadcms/richtext-lexical';
import {
  buildDefaultEditorState,
  getEnabledNodes,
  sanitizeClientEditorConfig,
} from '@payloadcms/richtext-lexical/client';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { $getRoot } from '@payloadcms/richtext-lexical/lexical';
import { createHeadlessEditor } from '@payloadcms/richtext-lexical/lexical/headless';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOM,
} from '@payloadcms/richtext-lexical/lexical/html';
import { useCallback, useMemo, useRef } from 'react';

const EMPTY_STATE = buildDefaultEditorState({});

interface UseHtmlLexicalAdapterProps {
  html: string;
  onChange: (html: string) => void;
}

export function useHtmlLexicalAdapter({
  html,
  onChange,
}: UseHtmlLexicalAdapterProps) {
  // 1. Maintain a persistent headless editor for conversion
  const headlessEditor = useRef(
    createHeadlessEditor({
      nodes: getEnabledNodes({
        editorConfig: sanitizeClientEditorConfig(
          // @ts-expect-error - FIXME
          defaultEditorFeatures,
          defaultEditorConfig,
        ),
      }),
    }),
  );

  // 2. HTML -> SerializedState
  const getSerializedState = useCallback(
    (htmlString: string): SerializedEditorState => {
      const editor = headlessEditor.current;
      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(htmlString, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);

          const root = $getRoot();
          root.clear().append(...nodes);
        },
        { discrete: true },
      );

      return editor.getEditorState().toJSON();
    },
    [],
  );

  // 3. Memoize the initial value to prevent unnecessary re-renders
  const value = useMemo(() => {
    const serializedState = getSerializedState(html);

    if (serializedState.root.children.length === 0) {
      return EMPTY_STATE;
    }

    return serializedState;
  }, [html, getSerializedState]);

  // 4. SerializedState -> HTML
  const setValue = useCallback(
    (serializedState: SerializedEditorState) => {
      const editor = headlessEditor.current;

      // Update headless editor to match the incoming state
      editor.setEditorState(editor.parseEditorState(serializedState));

      // Generate HTML and broadcast if it has changed
      editor.read(() => {
        const newHtml = $generateHtmlFromNodes(editor);
        if (newHtml !== html) {
          onChange(newHtml);
        }
      });
    },
    [html, onChange],
  );

  return { value: value as TypedEditorState<DefaultNodeTypes>, setValue };
}
