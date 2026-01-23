import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { EditorContent, useEditor } from '@tiptap/react';
import type { TemplateVariable } from '@/types';

import { parseIcuToProseMirrorJSON } from '@/utils/icu-tranform';

import type { InputWrapperProps } from './InputWrapper';
import { InputWrapper } from './InputWrapper';
import { VariableMention } from './variables/extension';

export interface MessageInputProps extends InputWrapperProps {
  value: string;
  lang: string;
  variables: TemplateVariable[];
  onChange: (value: string) => void;
  onBlur: () => void;
}

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
  const editor = useEditor({
    immediatelyRender: false,
    content: parseIcuToProseMirrorJSON(value),
    extensions: [Document, Paragraph, Text, VariableMention(variables)],
    onUpdate: ({ editor }) => onChange(editor.getText()),
  });

  return (
    <InputWrapper className={className} error={error} label={label}>
      <EditorContent
        className="tiptap-editor min-h-8"
        editor={editor}
        lang={lang}
        onBlur={onBlur}
      />
    </InputWrapper>
  );
}
