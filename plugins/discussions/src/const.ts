import type { EndpointConfig } from '@davincicoding/payload-plugin-kit';
import { createCommentSchema, createReplySchema } from './types';

export const ENDPOINTS = {
  createComment: {
    path: '/discussions-plugin/create-comment',
    method: 'post',
    input: createCommentSchema,
  },
  createReply: {
    path: '/discussions-plugin/create-reply',
    method: 'post',
    input: createReplySchema,
  },
} satisfies Record<string, EndpointConfig>;
