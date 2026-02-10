import { assertPopulated } from '@repo/common';
import type { BasePayload } from 'payload';
import type { Comment, User } from '@/payload-types';
import type { PopulatedComment } from '@/types';

export const populateComment = (
  data: Comment,
  payload: BasePayload,
): PopulatedComment => {
  const author = data.author ? assertPopulated(data.author) : null;
  const replies = data.replies
    ? assertPopulated(data.replies).map((reply) =>
        populateComment(reply, payload),
      )
    : [];

  if (!author)
    return {
      ...data,
      replies,
      author: null,
    };

  const displayName = (() => {
    const { useAsTitle = 'email' } = payload.collections.users.config.admin;
    if (!(useAsTitle in author)) return author.email;
    const value = author[useAsTitle as keyof User];
    if (typeof value !== 'string') return author.email;
    return value;
  })();

  return {
    ...data,
    replies,
    author: {
      id: author.id,
      displayName,
    },
  };
};
