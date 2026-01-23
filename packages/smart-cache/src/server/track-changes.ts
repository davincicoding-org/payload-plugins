import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload';

import type { CollectionChangeOperation } from '../types';

export const trackCollectionChange =
  (
    operations: CollectionChangeOperation[],
  ): CollectionAfterChangeHook<{
    id: string | number;
  }> =>
  async ({ req: { payload }, doc, collection, operation }) => {
    if (!operations.includes(operation)) return;

    const entityType = collection.slug;
    const entityId = doc.id.toString();

    // Check if this entity already has a pending change
    const {
      docs: [existingChange],
    } = await payload.find({
      collection: 'publish-queue',
      where: {
        and: [
          { entityType: { equals: entityType } },
          { entityId: { equals: entityId } },
        ],
      },
      limit: 1,
    });

    if (existingChange) {
      // Update existing change record
      await payload.update({
        collection: 'publish-queue',
        id: existingChange.id,
        data: {
          updatedAt: new Date().toISOString(),
        },
      });
    } else {
      await payload.create({
        collection: 'publish-queue',
        data: {
          entityType,
          entityId,
        },
      });
    }
  };

export const trackCollectionDelete: CollectionAfterDeleteHook<{
  id: string | number;
}> = async ({ req: { payload }, doc, collection }) => {
  const entityType = collection.slug;
  const entityId = doc.id.toString();

  // Check if this entity already has a pending change
  const {
    docs: [existingChange],
  } = await payload.find({
    collection: 'publish-queue',
    where: {
      and: [
        { entityType: { equals: entityType } },
        { entityId: { equals: entityId } },
      ],
    },
    limit: 1,
  });

  if (existingChange) {
    // Update existing change record
    await payload.update({
      collection: 'publish-queue',
      id: existingChange.id,
      data: {
        updatedAt: new Date().toISOString(),
      },
    });
  } else {
    await payload.create({
      collection: 'publish-queue',
      data: {
        entityType,
        entityId,
      },
    });
  }
};

export const trackGlobalChange: GlobalAfterChangeHook = async ({
  req: { payload },
  global,
}) => {
  const entityType = global.slug;

  // Check if this entity already has a pending change
  const {
    docs: [existingChange],
  } = await payload.find({
    collection: 'publish-queue',
    where: {
      and: [{ entityType: { equals: entityType } }],
    },
    limit: 1,
  });

  if (existingChange) {
    // Update existing change record
    await payload.update({
      collection: 'publish-queue',
      id: existingChange.id,
      data: {
        updatedAt: new Date().toISOString(),
      },
    });
  } else {
    // Create new change record
    await payload.create({
      collection: 'publish-queue',
      data: {
        entityType,
      },
    });
  }
};
