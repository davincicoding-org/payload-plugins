import type {
  LiteralElement,
  MessageFormatElement,
  PoundElement,
} from '@formatjs/icu-messageformat-parser';
import type { CollectionConfig, PayloadRequest } from 'payload';
import type { DeepPartial } from 'react-hook-form';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  /**
   * The slug of the collection to use for the messages.
   *
   * @default `messages`
   */
  collectionSlug?: string;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `(req) => req.user !== null // Authenticated users only`
   */
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  tabs?: boolean;
}

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
