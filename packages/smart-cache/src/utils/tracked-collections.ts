import { uncaughtSwitchCase } from '@repo/common';
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
    return fields.flatMap<CollectionSlug>((field) => {
      if ('relationTo' in field) {
        if (Array.isArray(field.relationTo)) {
          return field.relationTo;
        }
        return [field.relationTo];
      }

      if ('fields' in field) {
        return findRelationships(field.fields);
      }

      switch (field.type) {
        case 'blocks':
          return field.blocks.flatMap((block) =>
            findRelationships(block.fields),
          );
        case 'tabs':
          return field.tabs.flatMap((tab) => findRelationships(tab.fields));
        case 'text':
        case 'richText':
        case 'number':
        case 'checkbox':
        case 'date':
        case 'email':
        case 'select':
        case 'json':
        case 'code':
        case 'join':
        case 'point':
        case 'radio':
        case 'textarea':
        case 'ui':
          return [];
        default:
          return uncaughtSwitchCase(field);
      }
    });
  }
}
