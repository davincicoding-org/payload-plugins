import type {
  LiteralElement,
  MessageFormatElement,
  PoundElement,
} from '@formatjs/icu-messageformat-parser';
import type { CollectionConfig, GlobalSlug, PayloadRequest } from 'payload';
import type { DeepPartial } from 'react-hook-form';
import type { MessagesPluginConfig } from '.';

export type ResolvedPluginOptions<
  K extends
    keyof MessagesPluginConfig<MessagesSchema> = keyof MessagesPluginConfig<MessagesSchema>,
> = Pick<Required<MessagesPluginConfig<MessagesSchema>>, K>;

export type MessagesHooks = {
  afterUpdate?: () => Promise<void> | void;
} & CollectionConfig['hooks'];

/* MARK: Scope */

export interface TabScopeConfig {
  position: 'tab';
  existingFieldsTabLabel?: string;
}

export interface SidebarScopeConfig {
  position: 'sidebar';
}

export type ScopeConfig = TabScopeConfig | SidebarScopeConfig;

export type ScopePosition = ScopeConfig['position'];

export type ScopeKey<Schema extends MessagesSchema> = {
  [K in keyof Schema & GlobalSlug]: Schema[K] extends object ? K : never;
}[keyof Schema & GlobalSlug];

export type MessagesScopesConfig<Scope extends string = string> =
  | Scope[]
  | Record<Scope, ScopeConfig | ScopePosition>;

export type TypedMessagesScopesConfig<
  Schema extends MessagesSchema = MessagesSchema,
> = MessagesScopesConfig<ScopeKey<Schema>>;

export type EditorAccessGuard = (req: Pick<PayloadRequest, 'user'>) => boolean;

/* MARK: Messages */

export type Locale = string;

export type Translations<T> = Record<Locale, T>;

export type Messages = {
  [key: string]: Messages | string;
};

export type MessagesSchema = Messages;

export type MessageConfig = {
  description: string | undefined;
  variables: TemplateVariable[];
};

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
