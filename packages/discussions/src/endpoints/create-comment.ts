import { entityIdSchema } from '@repo/common';
import type { CollectionSlug, Endpoint } from 'payload';
import { z } from 'zod';
import { ENDPOINTS } from '@/procedures';
import type { OnCommentArgs } from '@/types';
import { populateComment } from '@/utitls/populate-comment';

export const createCommentEndpoint = ({
  collectionSlug,
  onComment,
}: {
  collectionSlug: string;
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
}): Endpoint =>
  ENDPOINTS.createComment.endpoint(
    async (req, { documentCollectionSlug, documentId, content }) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const newComment = await req.payload.create({
        collection: collectionSlug as CollectionSlug,
        data: { content },
        req,
      });

      const doc = await req.payload.findByID({
        collection: documentCollectionSlug as CollectionSlug,
        id: documentId,
        depth: 0,
      });

      const existingIds = z
        .object({
          discussions: z.array(entityIdSchema).nullable().default([]),
        })
        .transform(({ discussions }) => (discussions ?? []).map(String))
        .parse(doc);

      await req.payload.update({
        collection: documentCollectionSlug as CollectionSlug,
        id: documentId,
        // FIXME
        // @ts-expect-error - discussions field is not typed
        data: { discussions: [...existingIds, newComment.id] },
      });

      const createdComment = await req.payload.findByID({
        collection: collectionSlug as 'comments',
        id: newComment.id,
        depth: 1,
      });

      if (onComment) {
        Promise.resolve(
          onComment({
            req,
            comment: createdComment,
            documentId: String(documentId),
            collectionSlug: documentCollectionSlug,
          }),
        ).catch((err) =>
          console.error('[payload-discussions] onComment callback error:', err),
        );
      }

      return populateComment(createdComment, req.payload);
    },
  );
