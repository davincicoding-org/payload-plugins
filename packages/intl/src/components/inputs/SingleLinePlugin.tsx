import {
  COMMAND_PRIORITY_HIGH,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  LineBreakNode,
} from '@payloadcms/richtext-lexical/lexical';
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export function SingleLinePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregisterLineBreak = editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => true,
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => true,
      COMMAND_PRIORITY_HIGH,
    );
    // Catch line breaks inserted via paste or other means
    const unregisterTransform = editor.registerNodeTransform(
      LineBreakNode,
      (node) => {
        node.remove();
      },
    );
    return () => {
      unregisterLineBreak();
      unregisterParagraph();
      unregisterTransform();
    };
  }, [editor]);
  return null;
}
