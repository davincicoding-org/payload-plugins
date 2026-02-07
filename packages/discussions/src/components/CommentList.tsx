'use client';

import type { EntityID } from '@repo/common';
import type { PopulatedComment } from '../types';
import { CommentItem } from './CommentItem';
import styles from './CommentList.module.css';

interface CommentListProps {
  comments: PopulatedComment[];
  isLoading?: boolean;
  onReply: (parentId: EntityID, content: string) => Promise<void>;
  maxDepth: number;
}

export function CommentList({
  comments,
  isLoading = false,
  onReply,
  maxDepth,
}: CommentListProps) {
  if (isLoading) {
    return <div className={styles.placeholder}>Loading comments...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className={styles.placeholder}>
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {comments.map((comment) => (
        <CommentItem
          comment={comment}
          key={comment.id}
          maxDepth={maxDepth}
          onReply={onReply}
        />
      ))}
    </div>
  );
}
