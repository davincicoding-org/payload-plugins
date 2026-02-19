import type { CollectionConfig } from 'payload';

export const createCollectionConfigFactory =
  <T extends Record<string, unknown>>(
    factory:
      | Omit<CollectionConfig, 'slug'>
      | ((options: T & { slug: string }) => Omit<CollectionConfig, 'slug'>),
  ) =>
  (options: T & { slug: string }): CollectionConfig => ({
    slug: options.slug,
    ...(typeof factory === 'function' ? factory(options) : factory),
  });
