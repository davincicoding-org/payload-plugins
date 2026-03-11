import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
} from 'payload';
import type { DocumentInvalidationCallback, DocumentWithStatus } from './types';
import type { EntitiesGraph } from './utils/dependency-graph';
import { resolveTenantId } from './utils/resolve-tenant-id';

interface TenantConfig {
  tenantField?: string;
  tenantScopedCollections: Set<CollectionSlug>;
}

function buildTag(
  slug: string,
  tenantId: string | undefined,
  tenantScopedCollections: Set<CollectionSlug>,
): string {
  if (tenantId && tenantScopedCollections.has(slug as CollectionSlug)) {
    return `${slug}:${tenantId}`;
  }
  return slug;
}

async function invalidateWithDependents(
  payload: BasePayload,
  {
    graph,
    invalidationCallback,
    collection,
    ids,
    tenantId,
    tenantConfig,
  }: {
    graph: EntitiesGraph;
    invalidationCallback: DocumentInvalidationCallback | undefined;
    collection: CollectionSlug;
    ids: string[];
    tenantId: string | undefined;
    tenantConfig: TenantConfig;
  },
): Promise<void> {
  const tagsToInvalidate = new Set<string>();

  tagsToInvalidate.add(
    buildTag(collection, tenantId, tenantConfig.tenantScopedCollections),
  );

  await walkDependents(
    graph,
    payload,
    collection,
    ids,
    new Set(),
    tenantId,
    tenantConfig,
  );

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag);
  }

  for (const id of ids) {
    await invalidationCallback?.({
      type: 'collection',
      slug: collection,
      docID: id,
      tenantId,
    });
  }

  async function walkDependents(
    graph: EntitiesGraph,
    payload: BasePayload,
    changedCollection: CollectionSlug,
    changedIds: string[],
    visited: Set<string>,
    tenantId: string | undefined,
    tenantConfig: TenantConfig,
  ): Promise<void> {
    const dependents = graph.getDependants(changedCollection);

    if (dependents.length === 0) return;

    for (const dependent of dependents) {
      if (dependent.entity.type === 'global') {
        tagsToInvalidate.add(dependent.entity.slug);
        continue;
      }

      if (visited.has(dependent.entity.slug)) continue;

      const depIsTenantScoped = tenantConfig.tenantScopedCollections.has(
        dependent.entity.slug as CollectionSlug,
      );
      const effectiveTenantId = depIsTenantScoped ? tenantId : undefined;

      const allAffectedItems = new Map<string, { id: string | number }>();

      for (const field of dependent.fields) {
        const baseWhere = field.polymorphic
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
            };

        const where =
          effectiveTenantId && tenantConfig.tenantField
            ? {
                and: [
                  baseWhere,
                  {
                    [tenantConfig.tenantField]: {
                      equals: effectiveTenantId,
                    },
                  },
                ],
              }
            : baseWhere;

        const { docs } = await payload.find({
          collection: dependent.entity.slug,
          where,
        });

        for (const item of docs) {
          allAffectedItems.set(item.id.toString(), item);
        }
      }

      const affectedItems = Array.from(allAffectedItems.values());

      visited.add(dependent.entity.slug);

      if (affectedItems.length === 0) continue;

      tagsToInvalidate.add(
        buildTag(
          dependent.entity.slug,
          effectiveTenantId,
          tenantConfig.tenantScopedCollections,
        ),
      );

      for (const item of affectedItems) {
        await invalidationCallback?.({
          type: 'collection',
          slug: dependent.entity.slug,
          docID: item.id.toString(),
          tenantId: effectiveTenantId,
        });
      }

      await walkDependents(
        graph,
        payload,
        dependent.entity.slug,
        affectedItems.map((item) => item.id.toString()),
        visited,
        effectiveTenantId,
        tenantConfig,
      );
    }
  }
}

interface CollectionHookConfig {
  graph: EntitiesGraph;
  invalidationCallback: DocumentInvalidationCallback | undefined;
  tenantField?: string;
  tenantScopedCollections?: Set<CollectionSlug>;
}

export function invalidateCollectionCache({
  graph,
  invalidationCallback,
  tenantField,
  tenantScopedCollections = new Set(),
}: CollectionHookConfig): CollectionAfterChangeHook<DocumentWithStatus> {
  const tenantConfig: TenantConfig = { tenantField, tenantScopedCollections };

  return async ({ req, doc, collection, previousDoc }) => {
    if (req.context.skipRevalidation) return;

    if (collection.versions?.drafts) {
      if (doc._status === 'draft' && previousDoc._status !== 'published')
        return;
    }

    const tenantId = resolveTenantId(
      doc as Record<string, unknown>,
      tenantField,
    );

    await invalidateWithDependents(req.payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
      tenantId,
      tenantConfig,
    });
  };
}

export function invalidateCollectionCacheOnDelete({
  graph,
  invalidationCallback,
  tenantField,
  tenantScopedCollections = new Set(),
}: CollectionHookConfig & {
  invalidationCallback: DocumentInvalidationCallback;
}): CollectionAfterDeleteHook<DocumentWithStatus> {
  const tenantConfig: TenantConfig = { tenantField, tenantScopedCollections };

  return async ({ req, doc, collection }) => {
    if (req.context.skipRevalidation) return;

    const tenantId = resolveTenantId(
      doc as Record<string, unknown>,
      tenantField,
    );

    await invalidateWithDependents(req.payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
      tenantId,
      tenantConfig,
    });
  };
}

export function invalidateGlobalCache(
  invalidationCallback: DocumentInvalidationCallback,
): GlobalAfterChangeHook {
  return async ({ req, global, doc, previousDoc }) => {
    if (global.versions?.drafts) {
      if (doc._status === 'draft' && previousDoc._status !== 'published')
        return;
    }
    if (req.context.skipRevalidation) return;

    revalidateTag(global.slug);
    await invalidationCallback?.({ type: 'global', slug: global.slug });
  };
}
