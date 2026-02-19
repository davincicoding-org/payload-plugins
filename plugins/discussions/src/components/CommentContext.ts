'use client';

import { createContext, useContext } from 'react';
import type { PopulatedComment } from '../types';

export interface CommentContextValue {
  readonly comments: readonly PopulatedComment[];
  readonly activeReplyId: string | null;
  readonly maxDepth: number;
  readonly openReply: (id: string) => void;
  readonly closeReply: () => void;
  readonly submitReply: (
    parentId: string | null,
    content: string,
  ) => Promise<void>;
}

export const CommentContext = createContext<CommentContextValue | null>(null);

export function useCommentContext(): CommentContextValue {
  const ctx = useContext(CommentContext);
  if (!ctx)
    throw new Error('Comment components must be used within <CommentProvider>');
  return ctx;
}
