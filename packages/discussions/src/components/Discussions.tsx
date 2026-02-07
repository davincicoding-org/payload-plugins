'use client';

import { useConfig } from '@payloadcms/ui';
import type { EntityID } from '@repo/common';
import { useCallback, useState } from 'react';
import { createComment, createReply } from '../requests';
import type { PopulatedComment } from '../types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import styles from './Discussions.module.css';

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
    <div className={styles.root}>
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
