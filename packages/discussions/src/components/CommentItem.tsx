'use client';

import { formatTimeToNow, useTranslation } from '@payloadcms/ui';
import { useState } from 'react';
import type { EntityID } from '@/utils';
import type { PopulatedComment } from '../types';
import { CommentForm } from './CommentForm';
export interface CommentItemProps {
  comment: PopulatedComment;
  depth?: number;
  onReply: (parentId: EntityID, content: string) => Promise<void>;
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
      <div
        style={{
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: '0.5rem',
          paddingInline: '0.75rem',
          paddingBlock: '0.375rem',
          backgroundColor: 'var(--theme-elevation-100)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem',
            fontSize: '0.75rem',
            color: 'var(--theme-elevation-500)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--theme-text)' }}>
            {comment.author?.name || 'Unknown'}
          </span>
          <span>{formatTimeToNow({ date: comment.createdAt, i18n })}</span>
        </div>

        <div
          style={{
            fontSize: '1rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {comment.content}
        </div>
      </div>

      {canReply && !forceCollapse && (
        <div
          style={{
            display: 'flex',
            marginTop: '0.25rem',
            gap: '0.75rem',
            justifyContent: 'space-between',
            paddingInline: '0.5rem',
          }}
        >
          <button
            onClick={handleOpenReplyForm}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--theme-elevation-500)',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
            type="button"
          >
            Reply
          </button>

          {replies.length > 0 && (
            <button
              onClick={() => setShowReplies((current) => !current)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--theme-elevation-500)',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
              }}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginLeft: '0.5rem',
            paddingLeft: '1rem',
            borderLeft: '1px solid var(--theme-elevation-200)',
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
          }}
        >
          {replies.length > 0 && showReplies && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
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
