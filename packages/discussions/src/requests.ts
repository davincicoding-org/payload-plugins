import { requests } from '@payloadcms/ui/shared';
import { ENDPOINTS } from './const';
import type {
  ApiRequestData,
  CreateCommentData,
  CreateReplyData,
  PopulatedComment,
} from './types';

export async function createComment({
  apiRoute,
  documentCollectionSlug,
  documentId,
  content,
}: ApiRequestData<CreateCommentData>): Promise<PopulatedComment> {
  const response = await requests.post(
    `${apiRoute}/${ENDPOINTS.CREATE_COMMENT}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentCollectionSlug, documentId, content }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to create comment');
  }

  return response.json();
}

export async function createReply({
  apiRoute,
  parentId,
  content,
}: ApiRequestData<CreateReplyData>): Promise<PopulatedComment> {
  const response = await requests.post(
    `${apiRoute}/${ENDPOINTS.CREATE_REPLY}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, content }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to create reply');
  }

  return response.json();
}
