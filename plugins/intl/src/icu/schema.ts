import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import type { MessageConfig, TemplateVariable } from '@/types';

export const extractTemplateVariables = (schema: string): TemplateVariable[] =>
  collectTemplateVariables(parse(schema));

const collectTemplateVariables = (
  parts: MessageFormatElement[],
): TemplateVariable[] =>
  parts.flatMap<TemplateVariable>((part) => {
    switch (part.type) {
      case TYPE.literal:
      case TYPE.pound:
        return [];
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        return [part];
      case TYPE.plural:
      case TYPE.select:
        return [
          part,
          ...collectTemplateVariables(
            Object.values(part.options).flatMap(({ value }) => value),
          ),
        ];
      case TYPE.tag:
        return [part, ...collectTemplateVariables(part.children)];
      default:
        return [part];
    }
  });

export const parseMessageSchema = (schema: string): MessageConfig => {
  const description = schema.match(/^\[.+\]/)?.[0];
  // TODO add support for variables description
  // const withoutDescription = schema.replace(description || "", "").trim();
  // const withoutOptional = withoutDescription.split(" | ")[0]?.trim();

  return {
    description: description?.slice(1, -1),
    variables: extractTemplateVariables(schema),
  };
};
