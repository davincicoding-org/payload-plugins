import type { CollectionSlug, GlobalSlug, Plugin } from 'payload';
import { checkEndpoint } from '@/endpoints/check';
import { createPublishChangesEndpoint } from '@/endpoints/publish';
import { PublishQueue } from '@/entities';
import {
  trackCollectionChange,
  trackCollectionDelete,
  trackGlobalChange,
} from '@/hooks';
import type { ChangedDocuments } from '@/types';
import { getTrackedCollections } from '@/utils/tracked-collections';

export interface SmartCachePluginConfig {
  /**
   * The collections to track changes for.
   * By default, collections referenced via relationship or upload fields
   * are automatically tracked as well.
   */
  collections?: CollectionSlug[];
  /**
   * The globals to track changes for.
   * Collections referenced by these globals via relationship or upload
   * fields are automatically tracked as well.
   */
  globals?: GlobalSlug[];
  /**
   * Disable automatic tracking of collections referenced by the configured ones.
   * @default false
   */
  disableAutoTracking?: boolean;
  publishHandler?: (changes: ChangedDocuments) => void | Promise<void>;
}

export const smartCachePlugin =
  ({
    collections = [],
    globals = [],
    publishHandler,
    disableAutoTracking,
  }: SmartCachePluginConfig): Plugin =>
  (config) => {
    if (collections.length + globals.length === 0) {
      console.warn(
        '[payload-smart-cache] No collections or globals are configured to track changes for, hence this plugin will have no effect.',
      );
      return config;
    }
    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      path: 'payload-smart-cache/rsc#PublishButton',
    });

    config.globals ??= [];
    for (const global of config.globals) {
      if (!globals.includes(global.slug as GlobalSlug)) continue;
      global.hooks ??= {};
      global.hooks.afterChange ??= [];
      global.hooks.afterChange.push(trackGlobalChange);
    }

    config.collections ??= [];
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
      collection.hooks.afterChange.push(trackCollectionChange);
      collection.hooks.afterDelete ??= [];
      collection.hooks.afterDelete.push(trackCollectionDelete);
    }

    config.collections.push(PublishQueue);

    config.endpoints ??= [];
    config.endpoints.push(createPublishChangesEndpoint(publishHandler));
    config.endpoints.push(checkEndpoint);

    return config;
  };

export { createRequestHandler } from './exports/create-request';
export type { ChangedDocuments } from './types';
