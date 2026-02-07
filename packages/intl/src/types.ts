import type {
  LiteralElement,
  MessageFormatElement,
  PoundElement,
} from '@formatjs/icu-messageformat-parser';
import type { CollectionConfig, PayloadRequest } from 'payload';
import type { DeepPartial } from 'react-hook-form';
import type { MessagesPluginConfig } from '.';

export type ResolvedPluginOptions<
  K extends keyof MessagesPluginConfig = keyof MessagesPluginConfig,
> = Pick<Required<MessagesPluginConfig>, K>;

export type MessagesHooks = {
  afterUpdate?: () => Promise<void> | void;
} & CollectionConfig['hooks'];

export type MessagesGuard = (req: PayloadRequest) => boolean | Promise<boolean>;

/* MARK: Messages */

type Locale = string;
export type Locales = [Locale, ...Locale[]];

export type Translations<T> = Record<Locale, T>;

export type Messages<T = string> = {
  [key: string]: Messages<T> | T;
};

export type MessageSchema = (string & {}) | '$RICH$';
export type MessagesSchema = Messages<MessageSchema>;

export interface VariableMentionNodeAttrs {
  name: string;
  label: string;
  icu: string;
}

export type { DeepPartial };

export type TemplateVariable = Exclude<
  MessageFormatElement,
  LiteralElement | PoundElement
>;

export type {
  ArgumentElement,
  DateElement,
  LiteralElement,
  NumberElement,
  PluralElement,
  SelectElement,
  TagElement,
  TimeElement,
} from '@formatjs/icu-messageformat-parser';
