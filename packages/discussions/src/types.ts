import { type EntityID, entityIdSchema } from '@repo/common';
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
