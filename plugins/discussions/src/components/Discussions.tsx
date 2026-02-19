'use client';

import type { DocumentReference } from '@repo/common';
import type { PopulatedComment } from '../types';
import { CommentProvider } from './CommentProvider';
import { CommentsPanel } from './CommentsPanel';

export interface DiscussionsClientProps {
  readonly initialComments: PopulatedComment[];
  readonly documentReference: DocumentReference;
  readonly maxDepth: number;
}

export function DiscussionsClient({
  initialComments,
  documentReference,
  maxDepth,
}: DiscussionsClientProps) {
  return (
    <CommentProvider
      documentReference={documentReference}
      initialComments={initialComments}
      maxDepth={maxDepth}
    >
      <CommentsPanel />
    </CommentProvider>
  );
}
