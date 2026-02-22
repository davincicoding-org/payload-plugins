import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload';
import type {
  DocumentWithStatus,
  GraphResolverResult,
  InvalidationConfig,
} from '@/types';

interface InvalidateWithDependentsOptions {
  resolved: GraphResolverResult;
  config: InvalidationConfig;
  payload: BasePayload;
  collection: string;
  ids: string[];
}

async function invalidateWithDependents({
  resolved: { graph: depGraph, registeredCollections },
  config,
  payload,
  collection,
  ids,
}: InvalidateWithDependentsOptions): Promise<void> {
  const tagsToInvalidate = new Set<string>();

  tagsToInvalidate.add(collection);

  await walkDependents(depGraph, payload, collection, ids, new Set());

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag);
  }

  if (registeredCollections.has(collection)) {
    for (const id of ids) {
      await config.onInvalidate?.({
        type: 'collection',
        slug: collection,
        docID: id,
      });
    }
  }

  async function walkDependents(
    graph: typeof depGraph,
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

      if (registeredCollections.has(dependent.entity.slug)) {
        for (const item of affectedItems) {
          await config.onInvalidate?.({
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
): CollectionAfterChangeHook<DocumentWithStatus> {
  return async ({ req: { payload }, doc, collection }) => {
    if (collection.versions?.drafts && doc._status !== 'published') return;

    await invalidateWithDependents({
      resolved: config.resolve(payload),
      config,
      payload,
      collection: collection.slug,
      ids: [doc.id.toString()],
    });
  };
}

export function invalidateCollectionCacheOnDelete(
  config: InvalidationConfig,
): CollectionAfterDeleteHook<DocumentWithStatus> {
  return async ({ req: { payload }, doc, collection }) => {
    await invalidateWithDependents({
      resolved: config.resolve(payload),
      config,
      payload,
      collection: collection.slug,
      ids: [doc.id.toString()],
    });
  };
}

export function invalidateGlobalCache(
  config: InvalidationConfig,
): GlobalAfterChangeHook {
  return async ({ req: { payload }, global }) => {
    const { registeredGlobals } = config.resolve(payload);

    if (!registeredGlobals.has(global.slug)) return;

    revalidateTag(global.slug);
    await config.onInvalidate?.({ type: 'global', slug: global.slug });
  };
}
