import type { CollectionSlug, GlobalSlug } from 'payload';

export type EntitySlug = CollectionSlug | GlobalSlug;

export type CollectionOperation = CollectionChangeOperation | 'delete';

export type CollectionChangeOperation = 'create' | 'update';

type CollectionId = string; //| number;

export type ChangedDocuments = Partial<Record<CollectionSlug, CollectionId[]>>;

// FIXME
export interface PublishQueue {
  id: number;
  entityType: string;
  /**
   * ID of the changed entity
   */
  entityId?: string | null;
}
