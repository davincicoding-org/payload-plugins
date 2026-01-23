import type { CollectionSlug, Plugin } from 'payload';
import { PublishQueue } from './collections';
import { DEFAULT_OPERATIONS } from './const';
import { checkEndpoint } from './endpoints/check';
import { createPublishChangesEndpoint } from './endpoints/publish';
import {
  trackCollectionChange,
  trackCollectionDelete,
} from './server/track-changes';
import type {
  ChangedDocuments,
  CollectionChangeOperation,
  CollectionOperation,
} from './types';

export interface SmartCachePluginConfig {
  collections?: Partial<Record<CollectionSlug, CollectionOperation[] | false>>;
  publishHandler?: (changes: ChangedDocuments) => void | Promise<void>;
}

export const smartCachePlugin =
  ({
    collections: collectionOperations = {},
    publishHandler,
  }: SmartCachePluginConfig): Plugin =>
  (config) => {
    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      path: 'payload-smart-cache/rsc#PublishButton',
    });

    config.collections ??= [];
    config.collections.forEach((collection) => {
      const operations =
        collectionOperations[collection.slug as CollectionSlug] ??
        DEFAULT_OPERATIONS;
      if (operations === false) return;
      if (operations.length === 0) return;

      collection.hooks ??= {};

      const { hasDeleteOperation, changeOperations } = operations.reduce<{
        hasDeleteOperation: boolean;
        changeOperations: CollectionChangeOperation[];
      }>(
        (acc, operation) => {
          if (operation === 'delete') {
            acc.hasDeleteOperation = true;
          } else {
            acc.changeOperations.push(operation);
          }
          return acc;
        },
        {
          hasDeleteOperation: false,
          changeOperations: [],
        },
      );

      if (changeOperations.length > 0) {
        collection.hooks.afterChange ??= [];
        collection.hooks.afterChange.push(
          trackCollectionChange(changeOperations),
        );
      }
      if (hasDeleteOperation) {
        collection.hooks.afterDelete ??= [];
        collection.hooks.afterDelete.push(trackCollectionDelete);
      }
    });

    config.collections.push(PublishQueue);

    config.endpoints ??= [];
    config.endpoints.push(createPublishChangesEndpoint(publishHandler));
    config.endpoints.push(checkEndpoint);

    return config;
  };

export { createRequestHandler } from './server/request';
export type { ChangedDocuments } from './types';
