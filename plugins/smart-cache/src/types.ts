import type { DocumentID } from '@davincicoding/payload-plugin-kit';
import type {
  BasePayload,
  CollectionSlug,
  GlobalSlug,
  TypeWithID,
} from 'payload';
import type { EntitiesGraph } from '@/utils/dependency-graph';
import type { SmartCachePluginConfig } from '.';

export type ResolvedPluginOptions<
  K extends keyof SmartCachePluginConfig = keyof SmartCachePluginConfig,
> = Pick<Required<SmartCachePluginConfig>, K>;

export type EntitySlug = CollectionSlug | GlobalSlug;

/** Discriminated union passed to the `onInvalidate` callback. */
export type InvalidationChange<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> =
  | { type: 'collection'; slug: C; docID: DocumentID }
  | { type: 'global'; slug: G };

/** Callback type for the `onInvalidate` option. */
export type OnInvalidate<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> = (change: InvalidationChange<C, G>) => void | Promise<void>;

/** A document with an optional draft/publish status field. */
export type DocumentWithStatus = TypeWithID & {
  _status?: 'published' | 'draft';
};

/** The resolved result from a graph resolver call. */
export interface GraphResolverResult {
  graph: EntitiesGraph;
  registeredCollections: Set<CollectionSlug>;
  registeredGlobals: Set<GlobalSlug>;
}

/** Lazily resolves the dependency graph and registered entity sets. */
export type GraphResolver = (payload: BasePayload) => GraphResolverResult;

/** Config passed to each hook factory. */
export interface InvalidationConfig {
  resolve: GraphResolver;
  onInvalidate?: OnInvalidate;
}
