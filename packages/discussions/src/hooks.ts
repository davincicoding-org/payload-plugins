import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionSlug,
} from 'payload';

export const attachAuthor: CollectionBeforeChangeHook<{
  id: number | string;
  author: number | string;
}> = ({ req, operation, data }) => {
  if (operation === 'create' && req.user) {
    data.author = req.user.id;
  }

  return data;
};

export const createSoftDeleteCommentsHooks =
  ({
    commentsSlug,
  }: {
    commentsSlug: CollectionSlug;
  }): CollectionBeforeChangeHook<{
    id: number | string;
    discussions: (number | string)[] | null;
    deletedAt?: string;
  }> =>
  async ({ req, operation, data }) => {
    if (operation !== 'update') return data;

    if (!data.deletedAt) return data;

    if (!data.discussions) return data;

    if (data.discussions.length === 0) return data;

    void req.payload.delete({
      collection: commentsSlug,
      where: { id: { in: data.discussions } },
      req,
      trash: true,
    });

    return data;
  };

export const createRestoreCommentsHooks =
  ({
    commentsSlug,
  }: {
    commentsSlug: CollectionSlug;
  }): CollectionAfterChangeHook<{
    id: number | string;
    discussions: (number | string)[] | null;
    deletedAt?: string;
  }> =>
  async ({ doc, req, operation, previousDoc }) => {
    if (operation !== 'update') return doc;

    if (!previousDoc.deletedAt) return doc;
    if (doc.deletedAt) return doc;

    if (!doc.discussions) return doc;

    for (const comment of doc.discussions) {
      void req.payload.update({
        id: comment,
        collection: commentsSlug,
        data: {
          deletedAt: undefined,
        },
        req,
      });
    }

    return doc;
  };

export const createDeleteCommentsHooks =
  ({
    commentsSlug,
  }: {
    commentsSlug: CollectionSlug;
  }): CollectionAfterDeleteHook<{
    id: number | string;
    discussions: (number | string)[] | null;
    deletedAt?: string;
  }> =>
  async ({ doc, req }) => {
    if (!doc.discussions) return;
    if (doc.discussions.length === 0) return;

    await req.payload.delete({
      collection: commentsSlug,
      where: { id: { in: doc.discussions } },
      req,
      trash: Boolean(doc.deletedAt),
    });
  };

export const createSoftDeleteRepliesHooks =
  ({
    commentsSlug,
  }: {
    commentsSlug: CollectionSlug;
  }): CollectionBeforeChangeHook<{
    id: number | string;
    replies: (number | string)[] | null;
    deletedAt?: string;
  }> =>
  async ({ req, operation, data }) => {
    if (operation !== 'update') return data;
    if (!data.deletedAt) return data;

    if (!data.replies) return data;
    if (data.replies.length === 0) return data;

    await req.payload.delete({
      collection: commentsSlug,
      where: { id: { in: data.replies } },
      req,
      trash: true,
    });

    return data;
  };

export const createDeleteRepliesHooks =
  ({
    commentsSlug,
  }: {
    commentsSlug: CollectionSlug;
  }): CollectionAfterDeleteHook<{
    id: number | string;
    replies: (number | string)[] | null;
  }> =>
  async ({ doc, req }) => {
    if (!doc.replies) return;
    if (doc.replies.length === 0) return;

    await req.payload.delete({
      collection: commentsSlug,
      where: { id: { in: doc.replies } },
      req,
    });
  };
