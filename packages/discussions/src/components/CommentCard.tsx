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

  const handleToggleReplies = () => onToggleReplies(!repliesExpanded);

  return (
    <div className={styles.root} data-sticky={isReplying}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.author}>
            {comment.author?.displayName || 'Unknown'}
          </span>
          <time className={styles.time} dateTime={comment.createdAt}>
            {formatTimeToNow({ date: comment.createdAt, i18n })}
          </time>
        </div>
        <div className={styles.content}>{comment.content}</div>

        <div className={styles.actions}>
          {showReplyButton && (
            <Button
              buttonStyle="transparent"
              extraButtonProps={{
                'data-cancel': isReplying,
              }}
              onClick={onReplyToggle}
              size="xsmall"
              type="button"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </Button>
          )}

          {repliesCount > 0 && (
            <>
              <span className={styles.separator}>{'\u00B7'}</span>

              <Button
                buttonStyle="transparent"
                disabled={isReplying}
                onClick={handleToggleReplies}
                size="xsmall"
                type="button"
              >
                {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}{' '}
                {!isReplying && <>{repliesExpanded ? '\u2191' : '\u2193'}</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
