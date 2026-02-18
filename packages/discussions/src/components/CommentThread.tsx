'use client';

import { useMemo, useRef, useState } from 'react';
import type { PopulatedComment } from '../types';
import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import { useCommentContext } from './CommentContext';
import styles from './CommentThread.module.css';

export interface CommentThreadProps {
  readonly comment: PopulatedComment;
  readonly depth?: number;
}

export function CommentThread({ comment, depth = 0 }: CommentThreadProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef(false);
  const { activeReplyId, maxDepth, openReply, closeReply, submitReply } =
    useCommentContext();

  const [repliesExpanded, setRepliesExpanded] = useState(depth === 0);
  const [composerClosing, setComposerClosing] = useState(false);

  const isReplying = activeReplyId === comment.id;
  const hasReplies = (comment.replies ?? []).length > 0;
  const showReplyButton = depth < maxDepth;

  /** Keep composer in the DOM while the collapsible animates closed. */
  const composerMounted = isReplying || composerClosing;

  const replies = useMemo(
    () =>
      [...(comment.replies ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [comment.replies],
  );

  const handleCancelReply = () => {
    setComposerClosing(true);
    closeReply();
  };

  const handleReplyToggle = () => {
    if (isReplying) {
      handleCancelReply();
    } else {
      pendingScrollRef.current = true;
      openReply(comment.id);
    }
  };

  const handleToggleReplies = (expanded: boolean) => {
    if (expanded) {
      pendingScrollRef.current = true;
    }
    setRepliesExpanded(expanded);
  };

  const handlePanelTransitionEnd = (
    e: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'grid-template-rows')
      return;

    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleComposerTransitionEnd = (
    e: React.TransitionEvent<HTMLDivElement>,
  ) => {
    if (
      e.target === e.currentTarget &&
      e.propertyName === 'grid-template-rows' &&
      composerClosing
    ) {
      setComposerClosing(false);
    }
  };

  const handleSubmitReply = (content: string) =>
    submitReply(comment.id, content);

  return (
    <div className={styles.root} ref={rootRef}>
      <CommentCard
        comment={comment}
        isReplying={isReplying}
        onReplyToggle={handleReplyToggle}
        onToggleReplies={handleToggleReplies}
        repliesCount={replies.length}
        repliesExpanded={repliesExpanded || isReplying}
        showReplyButton={showReplyButton}
      />

      <div
        className={styles.collapsiblePanel}
        data-open={isReplying || (repliesExpanded && hasReplies) || undefined}
        onTransitionEnd={handlePanelTransitionEnd}
      >
        <div>
          <div className={styles.replies}>
            {replies.map((reply) => (
              <CommentThread comment={reply} depth={depth + 1} key={reply.id} />
            ))}

            <div
              className={styles.collapsiblePanel}
              data-open={isReplying || undefined}
              onTransitionEnd={handleComposerTransitionEnd}
            >
              {composerMounted && (
                <CommentComposer
                  autoFocus
                  onCancel={handleCancelReply}
                  onSubmit={handleSubmitReply}
                  placeholder="Write a reply..."
                  submitLabel="Reply"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
