import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  GlobalSlug,
  TypeWithID,
} from 'payload';
import type { EntitySlug } from '@/types';
import {
  createDependencyGraph,
  type EntitiesGraph,
} from '@/utils/dependency-graph';

interface HooksConfig {
  collections: CollectionSlug[];
  globals: GlobalSlug[];
  onInvalidate?: (change: {
    collection: EntitySlug;
    docID: string;
  }) => void | Promise<void>;
}

export function createHooks(config: HooksConfig) {
  let graph: EntitiesGraph | undefined;

  function getGraph(payload: BasePayload): EntitiesGraph {
    graph ??= createDependencyGraph(payload);
    return graph;
  }

  const registeredCollections = new Set(config.collections);
  const registeredGlobals = new Set(config.globals);

  /**
   * Walk the dependency graph starting from `collection` with the given `ids`,
   * revalidating cache tags and collecting affected documents for `onInvalidate`.
   */
  async function invalidate(
    payload: BasePayload,
    collection: CollectionSlug,
    ids: string[],
  ): Promise<void> {
    const depGraph = getGraph(payload);
    const tagsToInvalidate = new Set<EntitySlug>();

    // Seed the initial collection
    tagsToInvalidate.add(collection);

    // Recursively walk dependents
    await walkDependents(depGraph, payload, collection, ids, new Set());

    // Revalidate all affected cache tags
    for (const tag of tagsToInvalidate) {
      revalidateTag(tag);
    }

    // Fire onInvalidate for the source documents if registered
    if (config.onInvalidate && registeredCollections.has(collection)) {
      for (const id of ids) {
        await config.onInvalidate({ collection, docID: id });
      }
    }

    async function walkDependents(
      graph: EntitiesGraph,
      payload: BasePayload,
      changedCollection: CollectionSlug,
      changedIds: string[],
      visited: Set<string>,
    ): Promise<void> {
      const dependents = graph.getDependants(changedCollection);

      if (dependents.length === 0) return;

      for (const dependent of dependents) {
        if (dependent.entity.type === 'global') {
          tagsToInvalidate.add(dependent.entity.slug);
          continue;
        }

        if (visited.has(dependent.entity.slug)) continue;

        // Query each field separately to avoid duplicate table alias errors
        // when multiple fields map to the same table (e.g., highlights.split-image-text.image
        // and architecture.split-image-text.image both use projects_blocks_split_image_text)
        const allAffectedItems = new Map<string, { id: string | number }>();

        for (const field of dependent.fields) {
          const { docs } = await payload.find({
            collection: dependent.entity.slug,
            where: field.polymorphic
              ? {
                  and: [
                    {
                      [`${field.field}.relationTo`]: {
                        equals: changedCollection,
                      },
                    },
                    { [`${field.field}.value`]: { in: changedIds } },
                  ],
                }
              : {
                  [field.field]: {
                    in: changedIds,
                  },
                },
          });

          for (const item of docs) {
            allAffectedItems.set(item.id.toString(), item);
          }
        }

        const affectedItems = Array.from(allAffectedItems.values());

        visited.add(dependent.entity.slug);

        if (affectedItems.length === 0) continue;

        tagsToInvalidate.add(dependent.entity.slug);

        // Fire onInvalidate per affected document in registered collections
        if (
          config.onInvalidate &&
          registeredCollections.has(dependent.entity.slug)
        ) {
          for (const item of affectedItems) {
            await config.onInvalidate({
              collection: dependent.entity.slug,
              docID: item.id.toString(),
            });
          }
        }

        await walkDependents(
          graph,
          payload,
          dependent.entity.slug,
          affectedItems.map((item) => item.id.toString()),
          visited,
        );
      }
    }
  }

  const collectionAfterChange: CollectionAfterChangeHook<TypeWithID> = async ({
    req: { payload },
    doc,
    collection,
  }) => {
    const hasDrafts = Boolean(collection.versions?.drafts);

    if (hasDrafts) {
      // Only invalidate when the document transitions to published
      const status = (doc as Record<string, unknown>)._status;
      if (status !== 'published') return;
    }

    await invalidate(payload, collection.slug, [doc.id.toString()]);
  };

  const collectionAfterDelete: CollectionAfterDeleteHook<TypeWithID> = async ({
    req: { payload },
    doc,
    collection,
  }) => {
    await invalidate(payload, collection.slug, [doc.id.toString()]);
  };

  const globalAfterChange: GlobalAfterChangeHook = async ({ global }) => {
    // Globals are leaf nodes in the dependency graph — they depend on collections,
    // but nothing depends on them. So we just revalidate the global's own tag.
    revalidateTag(global.slug);

    if (
      config.onInvalidate &&
      registeredGlobals.has(global.slug as GlobalSlug)
    ) {
      await config.onInvalidate({
        collection: global.slug as GlobalSlug,
        docID: global.slug,
      });
    }
  };

  return {
    collectionAfterChange,
    collectionAfterDelete,
    globalAfterChange,
  };
}
