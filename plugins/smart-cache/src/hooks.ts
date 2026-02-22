import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  TypeWithID,
} from 'payload';
import {
  createDependencyGraph,
  type EntitiesGraph,
} from '@/utils/dependency-graph';

interface InvalidationConfig {
  collections: string[];
  globals: string[];
  onInvalidate?: (
    change:
      | { type: 'collection'; slug: string; docID: string }
      | { type: 'global'; slug: string },
  ) => void | Promise<void>;
}

function createGraphResolver() {
  let graph: EntitiesGraph | undefined;
  return (payload: BasePayload): EntitiesGraph => {
    graph ??= createDependencyGraph(payload);
    return graph;
  };
}

async function invalidateWithDependents(
  getGraph: (payload: BasePayload) => EntitiesGraph,
  config: InvalidationConfig,
  payload: BasePayload,
  collection: string,
  ids: string[],
): Promise<void> {
  const depGraph = getGraph(payload);
  const tagsToInvalidate = new Set<string>();
  const registeredCollections = new Set(config.collections);

  tagsToInvalidate.add(collection);

  await walkDependents(depGraph, payload, collection, ids, new Set());

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag);
  }

  if (config.onInvalidate && registeredCollections.has(collection)) {
    for (const id of ids) {
      await config.onInvalidate({
        type: 'collection',
        slug: collection,
        docID: id,
      });
    }
  }

  async function walkDependents(
    graph: EntitiesGraph,
    payload: BasePayload,
    changedCollection: string,
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

      if (
        config.onInvalidate &&
        registeredCollections.has(dependent.entity.slug)
      ) {
        for (const item of affectedItems) {
          await config.onInvalidate({
            type: 'collection',
            slug: dependent.entity.slug,
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

export function invalidateCollectionCache(
  config: InvalidationConfig,
): CollectionAfterChangeHook<TypeWithID> {
  const getGraph = createGraphResolver();

  return async ({ req: { payload }, doc, collection }) => {
    const hasDrafts = Boolean(collection.versions?.drafts);

    if (hasDrafts) {
      const status = (doc as Record<string, unknown>)._status;
      if (status !== 'published') return;
    }

    await invalidateWithDependents(getGraph, config, payload, collection.slug, [
      doc.id.toString(),
    ]);
  };
}

export function invalidateCollectionCacheOnDelete(
  config: InvalidationConfig,
): CollectionAfterDeleteHook<TypeWithID> {
  const getGraph = createGraphResolver();

  return async ({ req: { payload }, doc, collection }) => {
    await invalidateWithDependents(getGraph, config, payload, collection.slug, [
      doc.id.toString(),
    ]);
  };
}

export function invalidateGlobalCache(
  config: InvalidationConfig,
): GlobalAfterChangeHook {
  const registeredGlobals = new Set(config.globals);

  return async ({ global }) => {
    revalidateTag(global.slug);

    if (config.onInvalidate && registeredGlobals.has(global.slug)) {
      await config.onInvalidate({
        type: 'global',
        slug: global.slug,
      });
    }
  };
}
