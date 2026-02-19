import type { TemplateVariable } from '@/types';

import { isTagElement } from './guards';

export const toWords = (inputString: string, joinWords = false): string => {
  const capitalizeFirstLetter = (string: string): string =>
    string.charAt(0).toUpperCase() + string.slice(1);
  const notNullString = inputString || '';
  const trimmedString = notNullString.trim();
  const arrayOfStrings = trimmedString.split(/[\s-]/);

  const splitStringsArray: string[] = [];
  arrayOfStrings.forEach((tempString) => {
    if (tempString !== '') {
      const splitWords = tempString.split(/(?=[A-Z])/).join(' ');
      splitStringsArray.push(capitalizeFirstLetter(splitWords));
    }
  });

  return joinWords
    ? splitStringsArray.join('').replace(/\s/g, '')
    : splitStringsArray.join(' ');
};

export const formatVariableLabel = (variable: TemplateVariable) => {
  if (isTagElement(variable)) {
    return `<${variable.value}/>`;
  }
  return variable.value;
};
