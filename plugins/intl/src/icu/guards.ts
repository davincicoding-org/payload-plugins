import type {
  DateElement,
  MessageFormatElement,
  NumberElement,
  PluralElement,
  TimeElement,
} from '@formatjs/icu-messageformat-parser';
import {
  isArgumentElement,
  isDateElement,
  isLiteralElement,
  isNumberElement,
  isPluralElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
} from '@formatjs/icu-messageformat-parser';

export const isNumericElement = (
  element: MessageFormatElement,
): element is NumberElement | PluralElement =>
  isNumberElement(element) || isPluralElement(element);

export const isTemporalElement = (
  element: MessageFormatElement,
): element is DateElement | TimeElement =>
  isDateElement(element) || isTimeElement(element);

export {
  isLiteralElement,
  isArgumentElement,
  isNumberElement,
  isSelectElement,
  isPluralElement,
  isDateElement,
  isTimeElement,
  isTagElement,
};
