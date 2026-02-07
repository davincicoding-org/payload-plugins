'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  submitLabel = 'Submit',
  autoFocus = false,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = !content.trim() || isSubmitting;

  return (
    <div className={styles['comment-form']}>
      <textarea
        className={styles['comment-form__textarea']}
        disabled={isSubmitting}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        value={content}
      />
      <div className={styles['comment-form__footer']}>
        {onCancel && (
          <button
            className={styles['comment-form__cancel-button']}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className={[
            styles['comment-form__submit-button'],
            isDisabled ? styles['comment-form__submit-button--disabled'] : '',
          ]
            .filter(Boolean)
            .join(' ')}
          disabled={isDisabled}
          onClick={handleSubmit}
          type="button"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
