import { resolveDocumentID } from '@repo/common';
import type { FieldWithPath } from '@repo/common/utils';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  RelationshipField,
} from 'payload';

/**
 * Cascades hard-deletes to all documents referenced by a relationship field.
 */
export const createHardDeleteHook =
  ({
    path,
    relationTo,
  }: FieldWithPath<RelationshipField>): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    const grouped = groupByCollection(getByPath(doc, path), relationTo);

    for (const [collection, ids] of grouped) {
      await req.payload.delete({
        collection: collection as CollectionSlug,
        where: { id: { in: ids } },
        req,
      });
    }
  };

/**
 * Cascades soft-deletes (trash) to all documents referenced by a relationship field
 * when the parent transitions from live to trashed.
 */
export const createSoftDeleteHook =
  ({
    path,
    relationTo,
  }: FieldWithPath<RelationshipField>): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, operation }) => {
    if (operation !== 'update') return doc;
    if (previousDoc.deletedAt || !doc.deletedAt) return doc;

    const grouped = groupByCollection(getByPath(doc, path), relationTo);

    for (const [collection, ids] of grouped) {
      await req.payload.update({
        collection: collection as CollectionSlug,
        where: { id: { in: ids } },
        data: { deletedAt: new Date().toISOString() },
        req,
      });
    }

    return doc;
  };

/**
 * Cascades restores to all documents referenced by a relationship field
 * when the parent transitions from trashed to live.
 */
export const createRestoreHook =
  ({
    path,
    relationTo,
  }: FieldWithPath<RelationshipField>): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req, operation }) => {
    if (operation !== 'update') return doc;
    if (!previousDoc.deletedAt || doc.deletedAt) return doc;

    const grouped = groupByCollection(getByPath(doc, path), relationTo);

    for (const [collection, ids] of grouped) {
      await req.payload.update({
        collection: collection as CollectionSlug,
        where: { id: { in: ids } },
        data: { deletedAt: null },
        req,
        trash: true,
      });
    }

    return doc;
  };

// MARK: Utilities

function getByPath(obj: Record<string, unknown>, path: string[]) {
  return path.reduce<unknown>(
    (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
    obj,
  );
}

/**
 * Groups relationship values by target collection slug.
 * Handles both non-polymorphic (plain IDs / populated objects)
 * and polymorphic (`{ relationTo, value }`) shapes.
 */
function groupByCollection(
  value: unknown,
  relationTo: CollectionSlug | CollectionSlug[],
): Map<string, (string | number)[]> {
  const entries = Array.isArray(value) ? value : [value];
  const isPolymorphic = Array.isArray(relationTo);
  const grouped = new Map<string, (string | number)[]>();

  for (const entry of entries) {
    if (entry == null) continue;
    const ref = entry as Record<string, unknown>;
    const col = isPolymorphic ? (ref.relationTo as string) : relationTo;
    const raw = isPolymorphic ? ref.value : entry;
    if (!col || raw == null) continue;
    const id = resolveDocumentID(raw);
    const ids = grouped.get(col);
    if (ids) {
      ids.push(id);
    } else {
      grouped.set(col, [id]);
    }
  }

  return grouped;
}
