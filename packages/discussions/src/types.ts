import { entityIdSchema } from '@repo/common';
import { z } from 'zod/mini';
import type { Comment, User } from '@/payload-types';

export interface FieldConfig {
  maxDepth: number;
  commentsCollectionSlug: string;
}

export interface PopulatedAuthor extends User {
  id: number;
  name: string;
}

export interface PopulatedComment extends Omit<Comment, 'author' | 'replies'> {
  author: PopulatedAuthor | null;
  replies: PopulatedComment[] | null;
}

export type ApiRequestData<T extends Record<string, unknown>> = {
  apiRoute: string;
} & T;

export const createCommentSchema = z.object({
  content: z.string(),
  documentCollectionSlug: z.string(),
  documentId: entityIdSchema,
});

export type CreateCommentData = z.infer<typeof createCommentSchema>;

export const createReplySchema = z.object({
  content: z.string(),
  parentId: entityIdSchema,
});

export type CreateReplyData = z.infer<typeof createReplySchema>;
