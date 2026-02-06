import type { TypeWithID } from 'payload';
import {
  attachAuthor,
  createDeleteRepliesHooks,
  createSoftDeleteRepliesHooks,
} from './hooks';
import type { User } from './types';
import {
  createCollectionConfigFactory,
  type Entity,
  type EntityRelation,
} from './utils';

export interface Comment
  extends Entity<{
    content: string | null;
    author: EntityRelation<User> | null;
    replies: EntityRelation<Comment, 'many'> | null;
    createdAt: string;
  }> {}

export const Comments = createCollectionConfigFactory(({ slug }) => ({
  trash: true,
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'content', type: 'textarea' },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        condition: (data) => Boolean(data?.id),
      },
    },
    {
      name: 'replies',
      type: 'relationship',
      relationTo: slug,
      hasMany: true,
      admin: {
        condition: (data) => Boolean(data?.id),
      },
    },
  ],

  hooks: {
    beforeChange: [attachAuthor],
    afterChange: [createSoftDeleteRepliesHooks({ commentsSlug: slug })],
    afterDelete: [createDeleteRepliesHooks({ commentsSlug: slug })],
  },
}));
