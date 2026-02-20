import { uncaughtSwitchCase } from '@davincicoding/payload-plugin-kit';
import { TYPE } from '@formatjs/icu-messageformat-parser';
import type {
  SerializedLexicalNode,
  SerializedParagraphNode,
  SerializedTextNode,
} from '@payloadcms/richtext-lexical/lexical';
import type { SerializedBeautifulMentionNode } from 'lexical-beautiful-mentions';
import { formatVariableLabel } from '../components/input/utils';
import { parseICUMessage, serializeICUMessage } from './serialize';

function serializeTextNode(text: string): SerializedTextNode {
  return {
    type: 'text',
    version: 1,
    text,
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
  };
}

function serializeMentionNode(
  name: string,
  label: string,
  icu: string,
): SerializedBeautifulMentionNode {
  return {
    type: 'variableMention',
    version: 1,
    trigger: '@',
    value: name,
    data: { label, icu },
  };
}

type SerializedICUEditorState = {
  root: {
    type: 'root';
    version: 1;
    direction: null;
    format: '';
    indent: 0;
    children: [SerializedParagraphNode];
  };
};

/**
 * Parse an ICU message string into a Lexical serialized editor state
 */
export const parseIcuToLexicalState = (
  icuMessage: string,
): SerializedICUEditorState => {
  try {
    const elements = parseICUMessage(icuMessage);
    const children = elements.flatMap<SerializedLexicalNode>((element) => {
      switch (element.type) {
        case TYPE.literal:
          return [serializeTextNode(element.value)];
        case TYPE.pound:
          return [serializeTextNode('#')];
        case TYPE.argument:
        case TYPE.number:
        case TYPE.date:
        case TYPE.time:
        case TYPE.select:
        case TYPE.plural:
        case TYPE.tag:
          return [
            serializeMentionNode(
              element.value,
              formatVariableLabel(element),
              serializeICUMessage([element]),
            ),
          ];
        default:
          return uncaughtSwitchCase(element);
      }
    });

    return {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            textFormat: 0,
            textStyle: '',
            children,
          },
        ],
      },
    };
  } catch {
    return {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          {
            type: 'paragraph',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            textFormat: 0,
            textStyle: '',
            children: [serializeTextNode(icuMessage)],
          },
        ],
      },
    };
  }
};
