import type { CollectionConfig, CollectionSlug, TypeWithID } from 'payload';
import z from 'zod';

// MARK: Types

export const entityIdSchema = z.union([z.number(), z.string()]);
export type EntityID = TypeWithID['id'] & z.infer<typeof entityIdSchema>;

export type Entity<T extends Record<string, unknown>> = TypeWithID & T;
export type EntityRelation<
  T extends TypeWithID = TypeWithID,
  Cardinality extends 'one' | 'many' = 'one',
> = Cardinality extends 'many' ? (EntityID | T)[] : EntityID | T;

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

export const resolveForeignKey = (entity: EntityRelation) =>
  typeof entity === 'object' ? entity.id : entity;
