'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { useState } from 'react';
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
  const { activeReplyId, maxDepth, openReply, closeReply, submitReply } =
    useCommentContext();

  const [repliesExpanded, setRepliesExpanded] = useState(depth === 0);

  const isReplying = activeReplyId === comment.id;
  const showReplyButton = depth < maxDepth;
  const replies = comment.replies ?? [];

  const handleReplyToggle = () => {
    if (isReplying) {
      closeReply();
    } else {
      openReply(comment.id);
      setRepliesExpanded(true);
    }
  };

  return (
    <div>
      <CommentCard
        comment={comment}
        isReplying={isReplying}
        onReplyToggle={handleReplyToggle}
        onToggleReplies={setRepliesExpanded}
        repliesCount={replies.length}
        repliesExpanded={repliesExpanded}
        showReplyButton={showReplyButton}
      />

      <Collapsible.Root open={repliesExpanded || isReplying}>
        <Collapsible.Panel>
          <div className={styles.replies}>
            {replies.map((reply) => (
              <CommentThread comment={reply} depth={depth + 1} key={reply.id} />
            ))}

            {isReplying && (
              <CommentComposer
                onCancel={closeReply}
                onSubmit={(content) => submitReply(comment.id, content)}
                placeholder="Write a reply..."
                submitLabel="Reply"
              />
            )}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}
