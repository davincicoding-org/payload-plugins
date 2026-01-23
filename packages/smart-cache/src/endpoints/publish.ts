import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';
import { ENDPOINT_CONFIG } from '../const';
import type { SmartCachePluginConfig } from '../index';
import { revalidateCache } from '../server/revalidate';
import type { EntitySlug, PublishQueue } from '../types';
import { CollectionChanges } from '../utils/CollectionChanges';
import { createDependencyGraph } from '../utils/dependency-graph';

export const createPublishChangesEndpoint = (
  publishHandler: SmartCachePluginConfig['publishHandler'],
): Endpoint => ({
  ...ENDPOINT_CONFIG.publish,
  handler: async ({ payload }: PayloadRequest) => {
    const { docs: changesToPublish } = await payload.find({
      collection: 'publish-queue',
      sort: '-updatedAt',
    });

    if (changesToPublish.length === 0)
      return new Response('No changes to publish', { status: 200 });

    const tagsToInvalidate = new Set<EntitySlug>();
    const collectionChanges = new CollectionChanges();

    collectionChanges.initialize(changesToPublish as PublishQueue[]);

    const graph = createDependencyGraph(payload);

    for (const change of changesToPublish) {
      // Delete the change record (it's been processed)
      await payload.delete({
        collection: 'publish-queue',
        id: change.id,
      });
    }

    async function trackAffectedItems(
      collection: CollectionSlug,
      ids: string[],
      visited: Set<string>,
    ): Promise<void> {
      const dependents = graph.getDependants(collection);

      if (dependents.length === 0) return;

      for (const dependent of dependents) {
        if (dependent.entity.type === 'global') {
          // This causes too many revalidations, but maybe we can skip this completely?
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
            where: {
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

        return trackAffectedItems(
          dependent.entity.slug,
          affectedItems.map((item) => item.id.toString()),
          visited,
        );
      }
    }

    for (const [collection, ids] of collectionChanges.entries()) {
      await trackAffectedItems(collection, Array.from(ids), new Set<string>());
    }

    for (const entity of collectionChanges.keys()) {
      tagsToInvalidate.add(entity);
    }

    for (const tag of tagsToInvalidate) {
      await revalidateCache(tag);
    }

    await publishHandler?.(collectionChanges.serialize());

    return new Response('OK');
  },
});
