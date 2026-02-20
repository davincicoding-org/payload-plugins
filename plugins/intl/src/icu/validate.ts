import { TYPE } from '@formatjs/icu-messageformat-parser';
import type { ValidateResult } from 'react-hook-form';
import type { TemplateVariable } from '@/types';
import { isNumericElement, isTemporalElement } from './guards';
import { extractTemplateVariables } from './schema';

export const validateMessage = (
  value: unknown,
  variables: TemplateVariable[],
): ValidateResult => {
  if (typeof value !== 'string') return 'Invalid value';

  try {
    const variableUsages = extractTemplateVariables(value);

    for (const allowedVariable of variables) {
      const variableUsage = variableUsages.find(
        (placeholder) => placeholder.value === allowedVariable.value,
      );

      if (!variableUsage) continue;

      if (isNumericElement(allowedVariable)) {
        if (isNumericElement(variableUsage)) continue;
        return `{${allowedVariable.value}} has invalid type`;
      }

      if (isTemporalElement(allowedVariable)) {
        if (isTemporalElement(variableUsage)) continue;
        return `{${allowedVariable.value}} has invalid type`;
      }

      switch (allowedVariable.type) {
        case TYPE.argument:
          if (variableUsage.type === TYPE.argument) continue;
          return `{${allowedVariable.value}} has invalid type`;
        case TYPE.select: {
          if (variableUsage.type !== TYPE.select)
            return `{${allowedVariable.value}} has invalid type`;

          const allowedOptions = Object.keys(allowedVariable.options);
          for (const option of allowedOptions) {
            if (variableUsage.options[option]) continue;
            return `{${allowedVariable.value}} has missing option: ${option}`;
          }
          const usedOptions = Object.keys(variableUsage.options);
          for (const option of usedOptions) {
            if (allowedOptions.includes(option)) continue;
            return `{${allowedVariable.value}} has unsupported option: ${option}`;
          }
          continue;
        }
        case TYPE.tag:
          if (variableUsage.type === TYPE.tag) continue;
          return `{${allowedVariable.value}} has invalid type`;
      }
    }

    const supportedVariables = new Set(variables.map(({ value }) => value));

    for (const variableUsage of variableUsages) {
      if (supportedVariables.has(variableUsage.value)) continue;
      return `{${variableUsage.value}} is not supported`;
    }

    return true;
  } catch (error) {
    if (!(error instanceof Error)) return false;
    return `Invalid syntax: ${error.message}`;
  }
};

export const createValidator =
  (variables: TemplateVariable[]): MessageValidator =>
  (value: unknown) =>
    validateMessage(value, variables);

export type MessageValidator = (value: unknown) => ValidateResult;
