import { uncaughtSwitchCase } from '@davincicoding/payload-plugin-kit';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

/**
 * Parse an ICU message string into a AST array
 */
export const parseICUMessage = parse;

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

function stringifyElement(
  name: string,
  type?: string,
  options: (string | boolean)[] = [],
): string {
  if (type === undefined) return `{${name}}`;

  const filteredOptions = options.filter(
    (option): option is string =>
      typeof option === 'string' && option.length > 0,
  );
  if (filteredOptions.length === 0) return `{${name}, ${type}}`;

  return `{${name}, ${type}, ${filteredOptions.join(' ')}}`;
}
