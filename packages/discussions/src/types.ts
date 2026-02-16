import { type EntityID, entityIdSchema } from '@repo/common';
import type { PayloadRequest } from 'payload';
import { z } from 'zod';
import type { Comment } from '@/payload-types';

export interface FieldConfig {
  maxDepth: number;
  commentsCollectionSlug: string;
}

export interface PopulatedComment extends Omit<Comment, 'author' | 'replies'> {
  author: {
    id: EntityID;
    displayName: string;
  } | null;
  replies: PopulatedComment[] | null;
}

export const createCommentSchema = z.object({
  content: z.string(),
  documentCollectionSlug: z.string(),
  documentId: entityIdSchema,
});

export const createReplySchema = z.object({
  content: z.string(),
  parentId: entityIdSchema,
});

/** Arguments passed to the `onComment` callback after a comment or reply is created. */
export interface OnCommentArgs {
  req: PayloadRequest;
  comment: Comment;
  /** Present when this is a reply, absent for top-level comments. */
  parentComment?: Comment;
  /** The root (top-level) comment of the thread. Present when this is a reply. */
  rootComment?: Comment;
  documentId: string;
  collectionSlug: string;
}
