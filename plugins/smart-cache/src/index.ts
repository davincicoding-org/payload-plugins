import type { CollectionSlug, GlobalSlug, Plugin } from 'payload';
import {
  invalidateCollectionCache,
  invalidateCollectionCacheOnDelete,
  invalidateGlobalCache,
} from './hooks';
import type {
  DocumentInvalidation,
  DocumentInvalidationCallback,
  ResolvedPluginOptions,
} from './types';
import { createDependencyGraph } from './utils/dependency-graph';
import { getTenantScopedCollections } from './utils/tenant-scoped-collections';
import { getTrackedCollections } from './utils/tracked-collections';

export { tenantCacheTag } from './exports/cache';
export {
  createRequestHandler,
  type RequestHandlerCacheOptions,
} from './exports/create-request';
export {
  createTenantRequestHandler,
  type TenantRequestHandlerOptions,
} from './exports/create-tenant-request';
export type {
  DocumentInvalidation as InvalidationChange,
  DocumentInvalidationCallback as OnInvalidate,
} from './types';

export interface SmartCachePluginConfig<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> {
  /**
   * The collections to track changes for.
   * By default, collections referenced via relationship or upload fields
   * are automatically tracked as well.
   */
  collections?: C[];
  /**
   * The globals to track changes for.
   * Collections referenced by these globals via relationship or upload
   * fields are automatically tracked as well.
   */
  globals?: G[];
  /**
   * Disable automatic tracking of collections referenced by the configured ones.
   * @default false
   */
  disableAutoTracking?: boolean;
  /**
   * Called when cache invalidation is triggered.
   * Only fires for collections/globals explicitly registered in the config.
   */
  onInvalidate?: DocumentInvalidationCallback<C, G>;
  /**
   * Name of the tenant relationship field on your collections.
   * When set, cache invalidation is scoped per-tenant.
   * Collections without this field are treated as shared and use global invalidation.
   * Must match the field name used by `@payloadcms/plugin-multi-tenant` or your custom tenant field.
   */
  tenantField?: string;
}

export const smartCachePlugin =
  <
    C extends CollectionSlug = CollectionSlug,
    G extends GlobalSlug = GlobalSlug,
  >({
    collections = [],
    globals = [],
    onInvalidate,
    disableAutoTracking,
    tenantField,
  }: SmartCachePluginConfig<C, G>): Plugin =>
  (config) => {
    if (collections.length + globals.length === 0) {
      console.warn(
        '[payload-smart-cache] No collections or globals are configured to track changes for, hence this plugin will have no effect.',
      );
      return config;
    }

    const graph = createDependencyGraph(config);

    const invalidationCallback = wrapInvalidationCallback({
      collections,
      globals,
      onInvalidate: onInvalidate as DocumentInvalidationCallback,
    });

    config.globals ??= [];
    for (const global of config.globals) {
      if (!globals.includes(global.slug as G)) continue;
      global.hooks ??= {};
      global.hooks.afterChange ??= [];
      global.hooks.afterChange.push(
        invalidateGlobalCache(invalidationCallback),
      );
    }

    config.collections ??= [];
    const tenantScopedCollections = getTenantScopedCollections(
      config.collections,
      tenantField,
    );
    const collectionsToTrack = disableAutoTracking
      ? new Set(collections)
      : getTrackedCollections(
          { collections, globals },
          { collections: config.collections, globals: config.globals },
        );
    for (const collection of config.collections) {
      if (!collectionsToTrack.has(collection.slug as CollectionSlug)) continue;
      collection.hooks ??= {};
      collection.hooks.afterChange ??= [];
      collection.hooks.afterChange.push(
        invalidateCollectionCache({
          graph,
          invalidationCallback,
          tenantField,
          tenantScopedCollections,
        }),
      );
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterDelete.push(
        invalidateCollectionCacheOnDelete({
          graph,
          invalidationCallback,
          tenantField,
          tenantScopedCollections,
        }),
      );
    }

    return config;
  };

function wrapInvalidationCallback({
  collections,
  globals,
  onInvalidate,
}: ResolvedPluginOptions<
  'collections' | 'globals',
  'onInvalidate'
>): DocumentInvalidationCallback {
  if (!onInvalidate) return () => void 0;

  const registeredCollections = new Set(collections);
  const registeredGlobals = new Set(globals);

  return (change: DocumentInvalidation) => {
    if (change.type === 'collection' && !registeredCollections.has(change.slug))
      return;
    if (change.type === 'global' && !registeredGlobals.has(change.slug)) return;
    return onInvalidate(change);
  };
}
