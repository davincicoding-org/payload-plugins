import { entityIdSchema } from '@repo/common';
import type { CollectionSlug, Endpoint } from 'payload';
import { z } from 'zod';
import type { Comment } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type { OnCommentArgs } from '@/types';
import {
  findDocumentForComment,
  findRootComment,
} from '@/utils/resolve-thread-context';
import { populateComment } from '@/utitls/populate-comment';

export const createReplyEndpoint = ({
  collectionSlug,
  onComment,
  targetCollections,
}: {
  collectionSlug: string;
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
  targetCollections: string[];
}): Endpoint =>
  ENDPOINTS.createReply.endpoint(async (req, { parentId, content }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newReply = await req.payload.create({
      collection: collectionSlug as CollectionSlug,
      data: { content },
      req,
    });

    const parent = await req.payload.findByID({
      collection: collectionSlug as CollectionSlug,
      id: parentId,
      depth: 0,
    });

    const existingReplies = z
      .object({
        replies: z.array(entityIdSchema).nullable().default([]),
      })
      .transform(({ replies }) => (replies ?? []).map(String))
      .parse(parent);

    await req.payload.update({
      collection: collectionSlug as CollectionSlug,
      id: parentId,
      data: { replies: [...existingReplies, newReply.id] },
    });

    const createdReply = await req.payload.findByID({
      collection: collectionSlug as 'comments',
      id: newReply.id,
      depth: 1,
    });

    if (onComment) {
      Promise.resolve(
        (async () => {
          const rootId = await findRootComment(
            req.payload,
            parentId,
            collectionSlug,
          );
          const rootComment = await req.payload.findByID({
            collection: collectionSlug as CollectionSlug,
            id: rootId,
            depth: 1,
          });
          const docContext = await findDocumentForComment(
            req.payload,
            rootId,
            targetCollections,
          );
          await onComment({
            req,
            comment: createdReply,
            parentComment: parent as unknown as Comment,
            rootComment: rootComment as unknown as Comment,
            documentId: docContext?.documentId ?? '',
            collectionSlug: docContext?.collectionSlug ?? '',
          });
        })(),
      ).catch((err) =>
        console.error('[payload-discussions] onComment callback error:', err),
      );
    }

    return populateComment(createdReply, req.payload);
  });
