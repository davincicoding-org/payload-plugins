'use client';

import { Button } from '@payloadcms/ui';
import { useCallback, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import styles from './CommentComposer.module.css';

export interface CommentComposerProps {
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly autoFocus?: boolean;
  readonly onSubmit: (content: string) => void | Promise<void>;
  readonly onCancel?: () => void;
  readonly onFocus?: () => void;
}

export function CommentComposer({
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
  onFocus,
}: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setContent(e.target.value);

  const handleClick = () => void handleSubmit();

  const textareaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (autoFocus) el?.focus();
    },
    [autoFocus],
  );

  const isDisabled = !content.trim() || isSubmitting;

  return (
    <div className={styles.root}>
      <TextareaAutosize
        className={styles.textarea}
        disabled={isSubmitting}
        minRows={2}
        onChange={handleChange}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={textareaRef}
        value={content}
      />
      <div className={styles.footer}>
        {onCancel && (
          <Button
            buttonStyle="transparent"
            className={styles.cancelButton}
            disabled={isSubmitting}
            onClick={onCancel}
            size="small"
            type="button"
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={isDisabled}
          onClick={handleClick}
          size="small"
          type="button"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
