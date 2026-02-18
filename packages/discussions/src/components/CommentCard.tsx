'use client';

import { Button, formatTimeToNow, useTranslation } from '@payloadcms/ui';
import type { PopulatedComment } from '../types';
import styles from './CommentCard.module.css';

type CommentData = Pick<PopulatedComment, 'author' | 'createdAt' | 'content'>;

export interface CommentCardProps {
  readonly comment: CommentData;
  readonly isReplying: boolean;
  readonly onReplyToggle: () => void;
  readonly repliesCount: number;
  readonly repliesExpanded: boolean;
  readonly onToggleReplies: (expanded: boolean) => void;
  readonly showReplyButton: boolean;
}

export function CommentCard({
  comment,
  isReplying,
  onReplyToggle,
  repliesCount,
  repliesExpanded,
  onToggleReplies,
  showReplyButton,
}: CommentCardProps) {
  const { i18n } = useTranslation();

  const cardClassName = isReplying
    ? `${styles.card} ${styles.sticky}`
    : styles.card;

  return (
    <div>
      <div className={cardClassName}>
        <div className={styles.header}>
          <span className={styles.author}>
            {comment.author?.displayName || 'Unknown'}
          </span>
          <span>{formatTimeToNow({ date: comment.createdAt, i18n })}</span>
        </div>
        <div className={styles.content}>{comment.content}</div>
      </div>

      <div className={styles.actions}>
        {showReplyButton && (
          <Button
            buttonStyle="transparent"
            onClick={onReplyToggle}
            size="small"
            type="button"
          >
            {isReplying ? 'Cancel Reply' : 'Reply'}
          </Button>
        )}

        {repliesCount > 0 && (
          <Button
            buttonStyle="transparent"
            onClick={() => onToggleReplies(!repliesExpanded)}
            size="small"
            type="button"
          >
            {repliesExpanded
              ? `${repliesCount} replies \u2191`
              : `${repliesCount} replies \u2193`}
          </Button>
        )}
      </div>
    </div>
  );
}
