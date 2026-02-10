import { defineProcedure } from '@repo/common';
import type { PopulatedComment } from './types';
import { createCommentSchema, createReplySchema } from './types';

export const ENDPOINTS = {
  createComment: defineProcedure({
    path: '/discussions-plugin/create-comment',
    method: 'post',
    input: createCommentSchema,
  }).returns<PopulatedComment>(),
  createReply: defineProcedure({
    path: '/discussions-plugin/create-reply',
    method: 'post',
    input: createReplySchema,
  }).returns<PopulatedComment>(),
};
