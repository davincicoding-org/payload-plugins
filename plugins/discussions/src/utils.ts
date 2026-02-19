import {
  assertPopulated,
  type DocumentID,
  type DocumentReference,
} from '@repo/common';
import type { BasePayload } from 'payload';
import type { Comment, User } from '@/payload-types';
import {
  discussionsDocumentSchema,
  type PopulatedComment,
  type ResolvedPluginOptions,
} from '@/types';

/** Recursively populate author display names and nested replies. */
export const populateComment = (
  data: Comment,
  payload: BasePayload,
): PopulatedComment => {
  const author = assertPopulated(data.author);

  const displayName = (() => {
    const { useAsTitle = 'email' } = payload.collections.users.config.admin;
    if (!(useAsTitle in author)) return author.email;
    const value = author[useAsTitle as keyof User];
    if (typeof value !== 'string') return author.email;
    return value;
  })();

  const replies = data.replies
    ? assertPopulated(data.replies).map((reply) =>
        populateComment(reply, payload),
      )
    : [];

  return {
    ...data,
    author: {
      id: author.id,
      displayName,
    },
    replies,
  };
};

const MAX_DEPTH = 20;

/**
 * Walk up the reply chain to find the root (top-level) comment ID.
 * A root comment is one whose ID is not found in any other comment's `replies` field.
 */
export async function findRootComment(
  payload: BasePayload,
  commentId: DocumentID,
  commentsSlug: 'comments',
): Promise<string | number> {
  let currentId = commentId;

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const parent = await payload.find({
      collection: commentsSlug,
      where: { replies: { contains: currentId } },
      limit: 1,
      depth: 0,
    });

    const [firstDoc] = parent.docs;
    if (!firstDoc) break;
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
  rootCommentId: DocumentID,
  enabledEntities: ResolvedPluginOptions<'collections' | 'globals'>,
): Promise<DocumentReference> {
  for (const slug of enabledEntities.collections) {
    const result = await payload.find({
      collection: slug,
      where: { discussions: { contains: rootCommentId } },
      limit: 1,
      depth: 0,
    });

    const [firstDoc] = result.docs;

    if (!firstDoc) continue;

    return {
      entity: 'collection',
      id: firstDoc.id,
      slug: slug,
    };
  }

  for (const slug of enabledEntities.globals) {
    const result = await payload.findGlobal({
      slug,
      depth: 0,
    });

    const { data: comments, success } =
      discussionsDocumentSchema.safeParse(result);

    if (!success) continue;

    if (!comments.includes(rootCommentId)) continue;

    return {
      entity: 'global',
      slug: slug,
    };
  }

  throw new Error(`No document found for comment ${rootCommentId}`);
}
