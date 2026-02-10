import { revalidateTag } from 'next/cache';
import type { CollectionSlug, Endpoint } from 'payload';
import { APIError, headersWithCors } from 'payload';
import { ENDPOINTS } from '@/const';
import type { SmartCachePluginConfig } from '../index';
import type { EntitySlug } from '../types';
import { CollectionChanges } from '../utils/collection-changes';
import { createDependencyGraph } from '../utils/dependency-graph';

export const createPublishChangesEndpoint = (
  publishHandler: SmartCachePluginConfig['publishHandler'],
): Endpoint =>
  ENDPOINTS.publishChanges.endpoint(async (req) => {
    if (!req.user) {
      throw new APIError('Unauthorized', 401);
    }

    const { payload } = req;

    const { docs: changesToPublish } = await payload.find({
      collection: 'publish-queue',
      limit: 0,
      sort: '-updatedAt',
    });

    if (changesToPublish.length === 0)
      return new Response('No changes to publish', { status: 200 });

    const tagsToInvalidate = new Set<EntitySlug>();
    const collectionChanges = new CollectionChanges();

    for (const change of changesToPublish) {
      if (typeof change.entityId !== 'string') {
        tagsToInvalidate.add(change.entityType as EntitySlug);
      }
    }

    collectionChanges.initialize(changesToPublish);

    const graph = createDependencyGraph(payload);

    async function trackAffectedItems(
      collection: CollectionSlug,
      ids: string[],
      visited: Set<string>,
    ): Promise<void> {
      const dependents = graph.getDependants(collection);

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
        const allAffectedItems = new Map<
          string,
          {
            id: string | number;
          }
        >();

        for (const field of dependent.fields) {
          const { docs } = await payload.find({
            collection: dependent.entity.slug,
            where: field.polymorphic
              ? {
                  and: [
                    { [`${field.field}.relationTo`]: { equals: collection } },
                    { [`${field.field}.value`]: { in: ids } },
                  ],
                }
              : {
                  [field.field]: {
                    in: ids,
                  },
                },
          });

          // Use a Map keyed by ID to deduplicate results
          for (const item of docs) {
            allAffectedItems.set(item.id.toString(), item);
          }
        }

        const affectedItems = Array.from(allAffectedItems.values());

        visited.add(dependent.entity.slug);

        if (affectedItems.length === 0) continue;

        for (const item of affectedItems) {
          collectionChanges.addItem(dependent.entity.slug, item.id.toString());
        }

        await trackAffectedItems(
          dependent.entity.slug,
          affectedItems.map((item) => item.id.toString()),
          visited,
        );
      }
    }

    const initialCollections = Array.from(collectionChanges.entries()).map(
      ([slug, ids]) => [slug, Array.from(ids)] as const,
    );

    for (const [collection, ids] of initialCollections) {
      await trackAffectedItems(collection, ids, new Set<string>());
    }

    for (const entity of collectionChanges.keys()) {
      tagsToInvalidate.add(entity);
    }

    for (const tag of tagsToInvalidate) {
      revalidateTag(tag);
    }

    await publishHandler?.(collectionChanges.serialize());

    await payload.delete({
      collection: 'publish-queue',
      where: {
        id: { in: changesToPublish.map((change) => change.id) },
      },
    });

    return new Response('OK', {
      headers: headersWithCors({
        headers: new Headers(),
        req,
      }),
    });
  });
