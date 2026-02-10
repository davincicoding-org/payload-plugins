import { entityIdSchema } from '@repo/common';
import type { CollectionSlug, Endpoint } from 'payload';
import { z } from 'zod';
import { ENDPOINTS } from '@/procedures';
import { populateComment } from '@/utitls/populate-comment';

export const createReplyEndpoint = ({
  collectionSlug,
}: {
  collectionSlug: string;
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

    return populateComment(createdReply, req.payload);
  });
