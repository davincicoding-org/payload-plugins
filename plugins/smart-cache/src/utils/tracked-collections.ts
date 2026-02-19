import { findFields } from '@davincicoding/payload-plugin-kit';
import type { CollectionSlug, Config, Field, GlobalSlug } from 'payload';
import type { ResolvedPluginOptions } from '@/types';

export function getTrackedCollections(
  options: ResolvedPluginOptions<'collections' | 'globals'>,
  {
    collections: allCollections,
    globals: allGlobals,
  }: Required<Pick<Config, 'collections' | 'globals'>>,
): Set<CollectionSlug> {
  const tracked = new Set<CollectionSlug>();

  for (const slug of options.globals) {
    processGlobal(slug);
  }

  for (const slug of options.collections) {
    processCollection(slug);
  }

  return tracked;

  function processGlobal(slug: GlobalSlug) {
    const global = allGlobals.find((g) => g.slug === slug);
    if (!global)
      return console.warn(
        `[payload-smart-cache] Global to track changes for not found: ${slug}`,
      );

    const nestedCollections = findRelationships(global.fields);
    for (const nestedSlug of nestedCollections) {
      processCollection(nestedSlug);
    }
  }

  function processCollection(slug: CollectionSlug) {
    if (tracked.has(slug)) return;
    const collection = allCollections.find((c) => c.slug === slug);
    if (!collection)
      return console.warn(
        `[payload-smart-cache] Collection to track changes for not found: ${slug}`,
      );
    tracked.add(slug);

    const nestedCollections = findRelationships(collection.fields);
    for (const nestedSlug of nestedCollections) {
      processCollection(nestedSlug);
    }
  }

  function findRelationships(fields: Field[]): CollectionSlug[] {
    return findFields(fields, (field) => 'relationTo' in field).flatMap(
      ({ relationTo }) =>
        Array.isArray(relationTo) ? relationTo : [relationTo],
    );
  }
}
