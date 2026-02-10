'use client';

import { formatTimeToNow, useTranslation } from '@payloadcms/ui';
import { useState } from 'react';
import type { Comment } from '@/payload-types';
import type { PopulatedComment } from '../types';
import { CommentForm } from './CommentForm';
import styles from './CommentItem.module.css';
export interface CommentItemProps {
  comment: PopulatedComment;
  depth?: number;
  onReply: (parentId: Comment['id'], content: string) => Promise<void>;
  forceCollapse?: boolean;
  maxDepth: number;
}

export function CommentItem({
  comment,
  depth = 0,
  onReply,
  forceCollapse,
  maxDepth,
}: CommentItemProps) {
  const { i18n } = useTranslation();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth === 0);
  const [forceCollapseReplies, setForceCollapseReplies] = useState(false);

  const replies = comment.replies ?? [];
  const canReply = depth < maxDepth;

  const isExpanded = (() => {
    if (forceCollapse) return false;
    if (showReplyForm) return true;
    if (replies.length === 0) return false;

    return showReplies;
  })();

  const handleReply = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyForm(false);
    setShowReplies(true);
    setForceCollapseReplies(false);
  };

  const handleOpenReplyForm = () => {
    setForceCollapseReplies(true);
    setShowReplyForm(true);
  };

  const handleCloseReplyForm = () => {
    setShowReplyForm(false);
    setForceCollapseReplies(false);
  };

  return (
    <div>
      <div className={styles.bubble}>
        <div className={styles.header}>
          <span className={styles.author}>
            {comment.author?.displayName || 'Unknown'}
          </span>
          <span>{formatTimeToNow({ date: comment.createdAt, i18n })}</span>
        </div>

        <div className={styles.content}>{comment.content}</div>
      </div>

      {canReply && !forceCollapse && (
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={handleOpenReplyForm}
            type="button"
          >
            Reply
          </button>

          {replies.length > 0 && (
            <button
              className={styles.actionButton}
              onClick={() => setShowReplies((current) => !current)}
              type="button"
            >
              {`${showReplies ? 'Hide Replies' : `Show Replies`} (${
                replies.length
              })`}
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className={styles.replies}>
          {replies.length > 0 && showReplies && (
            <div className={styles.repliesList}>
              {replies.map((reply) => (
                <CommentItem
                  comment={reply}
                  depth={depth + 1}
                  forceCollapse={forceCollapseReplies}
                  key={reply.id}
                  maxDepth={maxDepth}
                  onReply={onReply}
                />
              ))}
            </div>
          )}

          {showReplyForm && (
            <CommentForm
              autoFocus
              onCancel={handleCloseReplyForm}
              onSubmit={handleReply}
              placeholder="Write a reply..."
              submitLabel="Reply"
            />
          )}
        </div>
      )}
    </div>
  );
}
