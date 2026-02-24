import {
  fetchDocumentByReference,
  updateDocumentByReference,
} from '@davincicoding/payload-plugin-kit';
import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import type { Endpoint } from 'payload';
import { ENDPOINTS } from '@/const';
import { type CreateCommentCallback, discussionsDocumentSchema } from '@/types';
import { populateComment } from '@/utils';

export const createCommentEndpoint = ({
  commentsSlug: collectionSlug,
  callback,
}: {
  commentsSlug: 'comments';
  callback?: CreateCommentCallback;
}): Endpoint =>
  createEndpointHandler(
    ENDPOINTS.createComment,
    async (req, { content, documentReference }) => {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const newComment = await req.payload.create({
        collection: collectionSlug,
        data: { author: req.user.id, content },
        req,
      });

      const documentData = await fetchDocumentByReference(
        req.payload,
        documentReference,
      );

      const existingComments = discussionsDocumentSchema.parse(documentData);

      await updateDocumentByReference(req.payload, documentReference, {
        discussions: [...existingComments, newComment.id],
      });

      const createdComment = await req.payload.findByID({
        collection: collectionSlug,
        id: newComment.id,
        depth: 1,
      });

      if (callback) {
        Promise.resolve(
          callback(req, {
            comment: createdComment,
            documentReference: documentReference,
          }),
        ).catch((err) =>
          console.error('[payload-discussions] onComment callback error:', err),
        );
      }

      return populateComment(createdComment, req.payload);
    },
  );
