import type { CollectionConfig, CollectionSlug, TypeWithID } from 'payload';
import z from 'zod';

// MARK: Types

export const entityIdSchema = z.union([z.number(), z.string()]);
export type EntityID = TypeWithID['id'] & z.infer<typeof entityIdSchema>;

// MARK: Type Guards

export const isPopulated = <T extends TypeWithID>(
  relationship: T | EntityID,
): relationship is T => typeof relationship === 'object';

export function assertPopulated<T extends TypeWithID | null>(
  docsOrIds: (T | EntityID)[],
  errorMessage?: (id: EntityID) => string,
): T[];
export function assertPopulated<T extends TypeWithID | null>(
  docOrId: T | EntityID,
  errorMessage?: (id: EntityID) => string,
): T;
export function assertPopulated<T extends TypeWithID | null>(
  value: T | EntityID | (T | EntityID)[],
  errorMessage = (id: EntityID) => `Doc is not populated: [${id}]`,
): T | T[] {
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => assertPopulated(item, errorMessage));
  }
  if (isPopulated(value)) return value;
  throw new Error(errorMessage(value as EntityID));
}

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

export type EntityReference = TypeWithID['id'] | TypeWithID;

export function isEntityReference(value: unknown): value is EntityReference {
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (value === null) return false;
  if (typeof value !== 'object') return true;
  if (!('id' in value)) return false;
  return isEntityReference(value.id);
}

export const resolveForeignKey = (entity: EntityReference) =>
  typeof entity === 'object' ? entity.id : entity;

export {
  defineProcedure,
  type Procedure,
  type ProcedureBuilder,
} from './procedure';
export { getAdminURL, getApiURL, getServerURL } from './urls';
export { findFields, uncaughtSwitchCase } from './utils';
