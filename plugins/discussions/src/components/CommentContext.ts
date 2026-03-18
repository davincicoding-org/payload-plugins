'use client';

import type { DocumentID } from '@davincicoding/payload-plugin-kit';
import { createContext, useContext } from 'react';
import type { PopulatedComment } from '../types';

export interface CommentContextValue {
  readonly comments: readonly PopulatedComment[];
  readonly activeReplyId: DocumentID | null;
  readonly maxDepth: number;
  readonly openReply: (id: DocumentID) => void;
  readonly closeReply: () => void;
  readonly submitReply: (
    parentId: DocumentID | null,
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
