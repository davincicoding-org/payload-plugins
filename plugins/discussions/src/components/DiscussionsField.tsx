import {
  type DocumentReference,
  uncaughtSwitchCase,
} from '@davincicoding/payload-plugin-kit';
import type { ServerComponentProps } from 'payload';
import { populateComment } from '@/utils';
import type { DiscussionsFieldConfig, PopulatedComment } from '../types';
import { DiscussionsClient } from './Discussions';

export const DiscussionsField = async ({
  payload,
  data,
  id,
  source,
  commentsSlug,
  maxDepth,
}: ServerComponentProps & DiscussionsFieldConfig) => {
  const discussionIds: number[] = (data?.discussions as number[]) || [];

  const documentReference = ((): DocumentReference => {
    switch (source.entity) {
      case 'global':
        return source;
      case 'collection':
        if (id === undefined)
          throw new Error(
            'DiscussionsField can only be used on exsting documents',
          );
        return {
          ...source,
          id,
        };
      default:
        return uncaughtSwitchCase(source);
    }
  })();

  const comments: PopulatedComment[] =
    discussionIds.length > 0
      ? await payload
          .find({
            collection: commentsSlug,
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
      documentReference={documentReference}
      initialComments={comments}
      maxDepth={maxDepth}
    />
  );
};
