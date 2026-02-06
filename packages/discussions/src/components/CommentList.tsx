'use client';

import type { EntityID } from '@/utils';
import type { PopulatedComment } from '../types';
import { CommentItem } from './CommentItem';

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
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--theme-elevation-500)',
          fontSize: '0.875rem',
        }}
      >
        Loading comments...
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--theme-elevation-500)',
          fontSize: '0.875rem',
        }}
      >
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
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
