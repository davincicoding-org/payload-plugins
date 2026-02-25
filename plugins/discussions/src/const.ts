import type { EndpointConfig } from '@davincicoding/payload-plugin-kit';
import {
  createCommentSchema,
  createReplySchema,
  populatedCommentSchema,
} from './types';

export const ENDPOINTS = {
  createComment: {
    path: '/discussions-plugin/create-comment',
    method: 'post',
    input: createCommentSchema,
    output: populatedCommentSchema,
  },
  createReply: {
    path: '/discussions-plugin/create-reply',
    method: 'post',
    input: createReplySchema,
    output: populatedCommentSchema,
  },
} satisfies Record<string, EndpointConfig>;
