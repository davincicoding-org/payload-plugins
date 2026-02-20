import { RenderLexical } from '@payloadcms/richtext-lexical/client';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { useHtmlLexicalAdapter } from './useHtmlLexicalAdapter';

export interface LexicalInputProps {
  lang: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function LexicalInput({
  value,
  onChange,
}: LexicalInputProps): React.ReactNode {
  const editor = useHtmlLexicalAdapter({
    html: value,
    onChange,
  });

  return (
    <RenderLexical
      field={{
        name: 'myCustomEditor',
        label: false,
        type: 'richText',
      }}
      schemaPath="global.intl-plugin.editorTemplate"
      setValue={(val) => editor.setValue(val as SerializedEditorState)}
      value={editor.value}
    />
  );
}
