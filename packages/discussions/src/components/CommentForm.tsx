'use client';

import { useEffect, useRef, useState } from 'react';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  submitLabel = 'Submit',
  autoFocus = false,
  style,
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

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        ...style,
      }}
    >
      <textarea
        disabled={isSubmitting}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        style={{
          width: '100%',
          padding: '0.75rem',
          outline: 'none',
          border: 'none',
          color: 'var(--theme-text)',
          backgroundColor: 'transparent',
          resize: 'vertical',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          scrollMarginBlock: '-200px',
        }}
        value={content}
      />
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          paddingInline: '0.5rem',
          paddingTop: '0.25rem',
          paddingBottom: '0.5rem',
        }}
      >
        {onCancel && (
          <button
            disabled={isSubmitting}
            onClick={onCancel}
            style={{
              padding: '0.125rem 0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          disabled={!content.trim() || isSubmitting}
          onClick={handleSubmit}
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'var(--theme-elevation-500)',
            color: 'var(--theme-elevation-0)',
            cursor: content.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
            opacity: content.trim() && !isSubmitting ? 1 : 0.5,
            fontSize: '0.75rem',
          }}
          type="button"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
