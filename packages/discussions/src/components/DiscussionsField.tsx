import type { CollectionSlug, ServerComponentProps } from 'payload';
import { populateComment } from '@/utitls/populate-comment';
import type { FieldConfig, PopulatedComment } from '../types';
import { DiscussionsClient } from './Discussions';

export const DiscussionsField = async ({
  payload,
  data,
  id,
  collectionSlug,
  commentsCollectionSlug,
  maxDepth,
}: ServerComponentProps & FieldConfig) => {
  if (id === undefined)
    throw new Error('Discussions field can only be used on existing documents');

  const discussionIds: number[] = (data?.discussions as number[]) || [];

  payload.collections.users.config.admin.useAsTitle;

  const comments: PopulatedComment[] =
    discussionIds.length > 0
      ? await payload
          .find({
            collection: commentsCollectionSlug as 'comments',
            where: { id: { in: discussionIds } },
            sort: '-createdAt',
            depth: maxDepth,
          })
          .then(({ docs }) =>
            docs.map((comment) => populateComment(comment, payload)),
          )
      : [];

  return (
    <DiscussionsClient
      documentCollectionSlug={collectionSlug}
      documentId={id}
      initialComments={comments}
      maxDepth={maxDepth}
    />
  );
};
