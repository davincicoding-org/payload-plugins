import type { CollectionConfig, TypeWithID } from 'payload';
import z from 'zod';

// MARK: Types

export const entityIdSchema = z.union([z.number(), z.string()]);
export type EntityID = TypeWithID['id'] & z.infer<typeof entityIdSchema>;

export type Entity<T extends Record<string, unknown>> = TypeWithID & T;
export type EntityRelation<
  T,
  Cardinality extends 'one' | 'many' = 'one',
> = Cardinality extends 'many' ? (EntityID | T)[] : EntityID | T;

// MARK: Utilities

export const createCollectionConfigFactory =
  <T extends { slug: string }>(
    factory:
      | Omit<CollectionConfig, 'slug'>
      | ((options: T) => Omit<CollectionConfig, 'slug'>),
  ) =>
  (options: T): CollectionConfig<T['slug']> => ({
    slug: options.slug,
    ...(typeof factory === 'function' ? factory(options) : factory),
  });
