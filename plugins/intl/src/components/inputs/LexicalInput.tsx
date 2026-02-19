import { RenderLexical } from '@payloadcms/richtext-lexical/client';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { useHtmlLexicalAdapter } from '../hooks/useHtmlLexicalAdapter';
import type { FieldWrapperProps } from './FieldWrapper';
import { FieldWrapper } from './FieldWrapper';

export interface LexicalInputProps extends FieldWrapperProps {
  lang: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function LexicalInput({
  error,
  label,
  value,
  onChange,
  className,
}: LexicalInputProps): React.ReactNode {
  const editor = useHtmlLexicalAdapter({
    html: value,
    onChange,
  });

  return (
    <FieldWrapper className={className} error={error} label={label}>
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
    </FieldWrapper>
  );
}
