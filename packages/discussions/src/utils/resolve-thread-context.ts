import type { BasePayload, CollectionSlug } from 'payload';

const MAX_DEPTH = 20;

/**
 * Walk up the reply chain to find the root (top-level) comment ID.
 * A root comment is one whose ID is not found in any other comment's `replies` field.
 */
export async function findRootComment(
  payload: BasePayload,
  commentId: string | number,
  commentsSlug: string,
): Promise<string | number> {
  let currentId = commentId;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const parent = await payload.find({
      collection: commentsSlug as CollectionSlug,
      where: { replies: { contains: currentId } },
      limit: 1,
      depth: 0,
    });

    const firstDoc = parent.docs[0];
    if (parent.totalDocs === 0 || !firstDoc) break;
    currentId = firstDoc.id;
  }

  return currentId;
}

/**
 * Find the document that owns a root comment by searching target collections
 * for a document whose `discussions` field contains the given comment ID.
 */
export async function findDocumentForComment(
  payload: BasePayload,
  rootCommentId: string | number,
  targetCollections: string[],
): Promise<{ documentId: string; collectionSlug: string } | null> {
  for (const slug of targetCollections) {
    const result = await payload.find({
      collection: slug as CollectionSlug,
      where: { discussions: { contains: rootCommentId } },
      limit: 1,
      depth: 0,
    });

    const firstDoc = result.docs[0];
    if (result.totalDocs > 0 && firstDoc) {
      return {
        documentId: String(firstDoc.id),
        collectionSlug: slug,
      };
    }
  }

  return null;
}
