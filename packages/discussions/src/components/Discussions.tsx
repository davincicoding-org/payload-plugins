'use client';

import { useConfig } from '@payloadcms/ui';
import { useCallback, useState } from 'react';
import type { EntityID } from '@/utils';
import { createComment, createReply } from '../requests';
import type { PopulatedComment } from '../types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

interface DiscussionsClientProps {
  initialComments: PopulatedComment[];
  documentId: number | string;
  documentCollectionSlug: string;
  maxDepth: number;
}

export function DiscussionsClient({
  initialComments,
  documentId,
  documentCollectionSlug,
  maxDepth,
}: DiscussionsClientProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const [comments, setComments] = useState(initialComments);

  const handleCreateComment = async (content: string) => {
    const populated = await createComment({
      apiRoute,
      documentCollectionSlug,
      documentId,
      content,
    });
    setComments((prev) => [populated, ...prev]);
  };

  const handleReply = useCallback(
    async (parentId: EntityID, content: string) => {
      const populated = await createReply({
        apiRoute,
        parentId,
        content,
      });

      const insertReply = (items: PopulatedComment[]): PopulatedComment[] =>
        items.map((item) =>
          item.id === parentId
            ? {
                ...item,
                replies: [...(item.replies || []), populated],
              }
            : {
                ...item,
                replies: item.replies ? insertReply(item.replies) : null,
              },
        );

      setComments((prev) => insertReply(prev));
    },
    [apiRoute],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <CommentForm
        onSubmit={handleCreateComment}
        placeholder="Add a comment..."
        submitLabel="Comment"
      />

      <CommentList
        comments={comments}
        isLoading={false}
        maxDepth={maxDepth}
        onReply={handleReply}
      />
    </div>
  );
}
