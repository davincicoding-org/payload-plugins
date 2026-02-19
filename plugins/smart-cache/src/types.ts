import type { CollectionSlug, GlobalSlug } from 'payload';
import type { SmartCachePluginConfig } from '.';

export type ResolvedPluginOptions<
  K extends keyof SmartCachePluginConfig = keyof SmartCachePluginConfig,
> = Pick<Required<SmartCachePluginConfig>, K>;

export type EntitySlug = CollectionSlug | GlobalSlug;

export type CollectionOperation = CollectionChangeOperation | 'delete';

export type CollectionChangeOperation = 'create' | 'update';

type CollectionId = string; //| number;

export type ChangedDocuments = Partial<Record<CollectionSlug, CollectionId[]>>;
