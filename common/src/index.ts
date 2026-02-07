import type { CollectionConfig, CollectionSlug, TypeWithID } from 'payload';
import z from 'zod';

// MARK: Types

export const entityIdSchema = z.union([z.number(), z.string()]);
export type EntityID = TypeWithID['id'] & z.infer<typeof entityIdSchema>;

// MARK: Utilities

export const createCollectionConfigFactory =
  <T extends Record<string, unknown>>(
    factory:
      | Omit<CollectionConfig, 'slug'>
      | ((
          options: T & { slug: CollectionSlug },
        ) => Omit<CollectionConfig, 'slug'>),
  ) =>
  (options: T & { slug: CollectionSlug }): CollectionConfig => ({
    slug: options.slug,
    ...(typeof factory === 'function' ? factory(options) : factory),
  });

export const resolveForeignKey = (entity: TypeWithID['id'] | TypeWithID) =>
  typeof entity === 'object' ? entity.id : entity;
