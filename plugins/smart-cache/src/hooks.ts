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
  onInvalidate?: (
    changes: Partial<Record<CollectionSlug, string[]>>,
  ) => void | Promise<void>;
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
    const affectedDocuments = new Map<CollectionSlug, Set<string>>();

    // Seed the initial collection
    tagsToInvalidate.add(collection);
    if (registeredCollections.has(collection)) {
      affectedDocuments.set(collection, new Set(ids));
    }

    // Recursively walk dependents
    await walkDependents(depGraph, payload, collection, ids, new Set());

    // Revalidate all affected cache tags
    for (const tag of tagsToInvalidate) {
      revalidateTag(tag);
    }

    // Fire onInvalidate for registered collections only
    if (config.onInvalidate && affectedDocuments.size > 0) {
      const serialized: Partial<Record<CollectionSlug, string[]>> = {};
      for (const [slug, docIds] of affectedDocuments) {
        serialized[slug] = Array.from(docIds);
      }
      await config.onInvalidate(serialized);
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

        // Only track for onInvalidate if this is a registered collection
        if (registeredCollections.has(dependent.entity.slug)) {
          const existing = affectedDocuments.get(dependent.entity.slug);
          if (existing) {
            for (const item of affectedItems) {
              existing.add(item.id.toString());
            }
          } else {
            affectedDocuments.set(
              dependent.entity.slug,
              new Set(affectedItems.map((item) => item.id.toString())),
            );
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
      await config.onInvalidate({});
    }
  };

  return {
    collectionAfterChange,
    collectionAfterDelete,
    globalAfterChange,
  };
}
