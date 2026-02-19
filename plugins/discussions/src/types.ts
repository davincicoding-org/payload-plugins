import {
  type DocumentID,
  type DocumentReference,
  documentIdSchema,
  documentReferenceSchema,
} from '@repo/common';
import type { PayloadRequest } from 'payload';
import { z } from 'zod';
import type { Comment } from '@/payload-types';
import type { DiscussionsPluginOptions } from '.';

export type ResolvedPluginOptions<
  K extends keyof DiscussionsPluginOptions = keyof DiscussionsPluginOptions,
> = Pick<Required<DiscussionsPluginOptions>, K>;

export interface DiscussionsFieldConfig {
  maxDepth: number;
  commentsSlug: 'comments';
  source: DocumentReference extends infer T
    ? T extends { id: DocumentID }
      ? Omit<T, 'id'>
      : T
    : never;
}

export interface PopulatedComment extends Omit<Comment, 'author' | 'replies'> {
  author: { id: DocumentID; displayName: string };
  replies: PopulatedComment[] | null;
}

export const discussionsDocumentSchema = z
  .object({
    discussions: z.array(documentIdSchema).nullable().default([]),
  })
  .transform(({ discussions }) => discussions ?? []);

export const createCommentSchema = z.object({
  content: z.string(),
  documentReference: documentReferenceSchema,
});

export const createReplySchema = z.object({
  content: z.string(),
  parentId: documentIdSchema,
});

export type CreateCommentCallback = (
  req: PayloadRequest,
  args: {
    comment: Comment;
    /** Present when this is a reply, absent for top-level comments. */
    parentComment?: Comment;
    /** The root (top-level) comment of the thread. Present when this is a reply. */
    rootComment?: Comment;
    documentReference: DocumentReference;
  },
) => void | Promise<void>;
