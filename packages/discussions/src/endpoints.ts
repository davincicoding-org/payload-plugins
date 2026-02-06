import {
  addDataAndFileToRequest,
  type CollectionSlug,
  type Endpoint,
} from 'payload';
import { z } from 'zod';
import { ENDPOINTS } from './const';
import { createCommentSchema, createReplySchema } from './types';

export function createEndpoints({
  collectionSlug,
}: {
  collectionSlug: string;
}): Endpoint[] {
  return [
    {
      path: ENDPOINTS.CREATE_COMMENT,
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await addDataAndFileToRequest(req);
        const { data, success, error } = createCommentSchema.safeParse(
          req.data,
        );
        if (!success) {
          return Response.json({ error }, { status: 400 });
        }

        const { documentCollectionSlug, documentId, content } = data;

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
            discussions: z.array(z.number()).nullable().default([]),
          })
          .transform(({ discussions }) => discussions ?? [])
          .parse(doc);

        await req.payload.update({
          collection: documentCollectionSlug as CollectionSlug,
          id: documentId,
          data: { discussions: [...existingIds, newComment.id] },
        });

        const populated = await req.payload.findByID({
          collection: collectionSlug as CollectionSlug,
          id: newComment.id,
          depth: 1,
        });

        return Response.json(populated, { status: 201 });
      },
    },
    {
      path: ENDPOINTS.CREATE_REPLY,
      method: 'post',
      handler: async (req) => {
        if (!req.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await addDataAndFileToRequest(req);
        const { data, success, error } = createReplySchema.safeParse(req.data);
        if (!success) {
          return Response.json({ error }, { status: 400 });
        }

        const { parentId, content } = data;

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
            replies: z.array(z.number()).nullable().default([]),
          })
          .transform(({ replies }) => replies ?? [])
          .parse(parent);

        await req.payload.update({
          collection: collectionSlug as CollectionSlug,
          id: parentId,
          data: { replies: [...existingReplies, newReply.id] },
        });

        const populated = await req.payload.findByID({
          collection: collectionSlug as CollectionSlug,
          id: newReply.id,
          depth: 1,
        });

        return Response.json(populated, { status: 201 });
      },
    },
  ];
}
