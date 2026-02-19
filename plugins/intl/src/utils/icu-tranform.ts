import { uncaughtSwitchCase } from '@davincicoding/payload-plugin-kit';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import type {
  SerializedLexicalNode,
  SerializedParagraphNode,
  SerializedTextNode,
} from '@payloadcms/richtext-lexical/lexical';
import type { SerializedBeautifulMentionNode } from 'lexical-beautiful-mentions';
import { formatVariableLabel } from './format';

/**
 * Parse an ICU message string into a AST array
 */
export const parseICUMessage = (message: string): MessageFormatElement[] =>
  parse(message);

/**
 * Serialize an ICU message AST array into a ICU message string
 */
export const serializeICUMessage = (elements: MessageFormatElement[]): string =>
  elements
    .map((element) => {
      switch (element.type) {
        case TYPE.literal:
          return element.value;
        case TYPE.argument:
          return stringifyElement(element.value);
        case TYPE.number:
          // TODO serialize element.style
          return stringifyElement(element.value, 'number');
        case TYPE.select:
          return stringifyElement(
            element.value,
            'select',
            Object.entries(element.options).map(
              ([key, option]) =>
                `${key} {${option.value.length > 0 ? serializeICUMessage(option.value) : key}}`,
            ),
          );
        case TYPE.plural:
          return stringifyElement(element.value, 'plural', [
            element.offset < 0 && `offset:${element.offset}`,
            ...Object.entries(element.options).map(
              ([key, option]) =>
                `${key} {${
                  option.value.length > 0
                    ? serializeICUMessage(option.value)
                    : key
                }}`,
            ),
          ]);
        case TYPE.tag:
          return `<${element.value}>${serializeICUMessage(element.children)}</${element.value}>`;
        case TYPE.date:
          // TODO serialize element.style
          return stringifyElement(element.value, 'date');
        case TYPE.time:
          // TODO serialize element.style
          return stringifyElement(element.value, 'time');
        case TYPE.pound:
          return '#';
        default:
          return uncaughtSwitchCase(element);
      }
    })
    .join('');

const stringifyElement = (
  name: string,
  type?: string,
  options: (string | boolean)[] = [],
) => {
  if (type === undefined) return `{${name}}`;

  const filteredOptions = options.filter(
    (option): option is string =>
      typeof option === 'string' && option.length > 0,
  );
  if (filteredOptions.length === 0) return `{${name}, ${type}}`;

  return `{${name}, ${type}, ${filteredOptions.join(' ')}}`;
};

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
