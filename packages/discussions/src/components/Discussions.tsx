'use client';

import { useConfig } from '@payloadcms/ui';
import type { DocumentID, DocumentReference } from '@repo/common';
import { useCallback, useState } from 'react';
import { ENDPOINTS } from '@/procedures';
import type { PopulatedComment } from '../types';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import styles from './Discussions.module.css';

interface DiscussionsClientProps {
  initialComments: PopulatedComment[];
  documentReference: DocumentReference;
  maxDepth: number;
}

export function DiscussionsClient({
  initialComments,
  documentReference,
  maxDepth,
}: DiscussionsClientProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const [comments, setComments] = useState(initialComments);

  const handleCreateComment = async (content: string) => {
    const populated = await ENDPOINTS.createComment.call(apiRoute, {
      content,
      documentReference,
    });
    setComments((prev) => [populated, ...prev]);
  };

  const handleReply = useCallback(
    async (parentId: DocumentID, content: string) => {
      const populated = await ENDPOINTS.createReply.call(apiRoute, {
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
