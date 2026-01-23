import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import type { VariableMentionNodeAttrs } from '@/types';

import { formatVariableLabel } from './format';
import { uncaughtSwitchCase } from './guards';

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

type TextContent = {
  type: 'text';
  text: string;
};

type VariableContent = {
  type: 'variable';
  attrs: VariableMentionNodeAttrs;
};

type ProseMirrorJSONRepresentation = {
  type: 'doc';
  content: {
    type: 'paragraph';
    content: (TextContent | VariableContent)[];
  }[];
};

/**
 * Parse an ICU message string into a ProseMirror JSON representation
 */
export const parseIcuToProseMirrorJSON = (
  icuMessage: string,
): ProseMirrorJSONRepresentation => {
  try {
    const elements = parseICUMessage(icuMessage);
    const content = elements.flatMap<TextContent | VariableContent>(
      (element) => {
        switch (element.type) {
          case TYPE.literal:
            return [
              {
                type: 'text',
                text: element.value,
              },
            ];
          case TYPE.pound:
            return [
              {
                type: 'text',
                text: '#',
              },
            ];
          case TYPE.argument:
          case TYPE.number:
          case TYPE.date:
          case TYPE.time:
          case TYPE.select:
          case TYPE.plural:
          case TYPE.tag:
            return [
              {
                type: 'variable',
                attrs: {
                  name: element.value,
                  label: formatVariableLabel(element),
                  icu: serializeICUMessage([element]),
                },
              },
            ];
          default:
            return uncaughtSwitchCase(element);
        }
      },
    );

    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content,
        },
      ],
    };
  } catch (error) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: icuMessage,
            },
          ],
        },
      ],
    };
  }
};
