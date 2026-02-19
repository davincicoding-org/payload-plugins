'use client';

import type { DocumentReference } from '@davincicoding/payload-plugin-kit';
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
