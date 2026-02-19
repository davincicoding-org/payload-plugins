import { documentIdSchema } from '@davincicoding/payload-plugin-kit';
import type { Endpoint } from 'payload';
import { z } from 'zod';
import { ENDPOINTS } from '@/procedures';
import type { CreateCommentCallback, ResolvedPluginOptions } from '@/types';
import {
  findDocumentForComment,
  findRootComment,
  populateComment,
} from '@/utils';

export const createReplyEndpoint = ({
  commentsSlug,
  callback,
  enabledEntities,
}: {
  commentsSlug: 'comments';
  callback?: CreateCommentCallback;
  enabledEntities: ResolvedPluginOptions<'collections' | 'globals'>;
}): Endpoint =>
  ENDPOINTS.createReply.endpoint(async (req, { parentId, content }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newReply = await req.payload.create({
      collection: commentsSlug,
      data: { author: req.user.id, content },
      req,
    });

    const parentComment = await req.payload.findByID({
      collection: commentsSlug,
      id: parentId,
      depth: 0,
    });

    const existingReplies = z
      .object({
        replies: z.array(documentIdSchema).nullable().default([]),
      })
      .transform(({ replies }) => replies ?? [])
      .parse(parentComment);

    await req.payload.update({
      collection: commentsSlug,
      id: parentId as string,
      data: {
        replies: [...(existingReplies as string[]), newReply.id as string],
      },
    });

    const createdReply = await req.payload.findByID({
      collection: commentsSlug,
      id: newReply.id,
      depth: 1,
    });

    if (callback) {
      Promise.resolve(
        (async () => {
          const rootId = await findRootComment(
            req.payload,
            parentId,
            commentsSlug,
          );

          const rootComment = await req.payload.findByID({
            collection: commentsSlug,
            id: rootId,
            depth: 1,
          });

          const documentReference = await findDocumentForComment(
            req.payload,
            rootId,
            enabledEntities,
          );

          await callback(req, {
            comment: createdReply,
            parentComment,
            rootComment,
            documentReference,
          });
        })(),
      ).catch((err) =>
        console.error('[payload-discussions] onComment callback error:', err),
      );
    }

    return populateComment(createdReply, req.payload);
  });
