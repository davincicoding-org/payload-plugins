import { entityIdSchema } from '@repo/common';
import type { CollectionSlug, Endpoint } from 'payload';
import { z } from 'zod';
import { ENDPOINTS } from '@/procedures';
import { populateComment } from '@/utitls/populate-comment';
import type { PopulatedComment } from '../types';

export const createCommentEndpoint = ({
  collectionSlug,
}: {
  collectionSlug: string;
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

      return populateComment(createdComment, req.payload);
    },
  );
