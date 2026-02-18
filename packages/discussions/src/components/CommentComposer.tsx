'use client';

import { Button } from '@payloadcms/ui';
import { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import styles from './CommentComposer.module.css';

export interface CommentComposerProps {
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly onSubmit: (content: string) => void | Promise<void>;
  readonly onCancel?: () => void;
  readonly onFocus?: () => void;
}

export function CommentComposer({
  placeholder,
  submitLabel,
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

  const isDisabled = !content.trim() || isSubmitting;

  return (
    <div className={styles.form}>
      <TextareaAutosize
        className={styles.textarea}
        disabled={isSubmitting}
        onChange={(e) => setContent(e.target.value)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={content}
      />
      <div className={styles.footer}>
        {onCancel && (
          <Button
            buttonStyle="transparent"
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
          onClick={() => void handleSubmit()}
          size="small"
          type="button"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
