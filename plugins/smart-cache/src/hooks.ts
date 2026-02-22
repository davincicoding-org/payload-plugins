import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload';
import type { DocumentInvalidationCallback, DocumentWithStatus } from '@/types';
import type { EntitiesGraph } from './utils/dependency-graph';

async function invalidateWithDependents(
  payload: BasePayload,
  {
    graph,
    invalidationCallback,
    collection,
    ids,
  }: {
    graph: EntitiesGraph;
    invalidationCallback: DocumentInvalidationCallback | undefined;
    collection: string;
    ids: string[];
  },
): Promise<void> {
  const tagsToInvalidate = new Set<string>();

  tagsToInvalidate.add(collection);

  await walkDependents(graph, payload, collection, ids, new Set());

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag);
  }

  for (const id of ids) {
    await invalidationCallback?.({
      type: 'collection',
      slug: collection,
      docID: id,
    });
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

      for (const item of affectedItems) {
        await invalidationCallback?.({
          type: 'collection',
          slug: dependent.entity.slug,
          docID: item.id.toString(),
        });
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

export function invalidateCollectionCache({
  graph,
  invalidationCallback,
}: {
  graph: EntitiesGraph;
  invalidationCallback: DocumentInvalidationCallback | undefined;
}): CollectionAfterChangeHook<DocumentWithStatus> {
  return async ({ req: { payload }, doc, collection }) => {
    if (collection.versions?.drafts && doc._status !== 'published') return;

    await invalidateWithDependents(payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
    });
  };
}

export function invalidateCollectionCacheOnDelete({
  graph,
  invalidationCallback,
}: {
  graph: EntitiesGraph;
  invalidationCallback: DocumentInvalidationCallback;
}): CollectionAfterDeleteHook<DocumentWithStatus> {
  return async ({ req: { payload }, doc, collection }) => {
    await invalidateWithDependents(payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
    });
  };
}

export function invalidateGlobalCache(
  invalidationCallback: DocumentInvalidationCallback,
): GlobalAfterChangeHook {
  return async ({ global }) => {
    revalidateTag(global.slug);
    await invalidationCallback?.({ type: 'global', slug: global.slug });
  };
}
