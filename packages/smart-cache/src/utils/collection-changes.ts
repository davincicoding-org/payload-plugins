import type { CollectionSlug } from 'payload';
import type { PublishQueue } from '@/payload-types';

export class CollectionChanges extends Map<CollectionSlug, Set<string>> {
  initialize(changes: PublishQueue[]) {
    for (const change of changes) {
      if (typeof change.entityId !== 'string') continue;

      this.addItem(change.entityType as CollectionSlug, change.entityId);
    }
  }

  addItem(collection: CollectionSlug, id: string) {
    const changedIds = this.get(collection);
    if (changedIds) {
      changedIds.add(id);
    } else {
      this.set(collection, new Set([id]));
    }
  }

  serialize(): Partial<Record<CollectionSlug, string[]>> {
    const result: Partial<Record<CollectionSlug, string[]>> = {};
    for (const [collection, ids] of this.entries()) {
      result[collection] = Array.from(ids);
    }
    return result;
  }
}
