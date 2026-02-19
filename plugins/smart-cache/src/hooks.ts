import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  TypeWithID,
} from 'payload';

export const trackCollectionChange: CollectionAfterChangeHook<
  TypeWithID
> = async ({ req: { payload }, doc, collection }) => {
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

export const trackCollectionDelete: CollectionAfterDeleteHook<
  TypeWithID
> = async ({ req: { payload }, doc, collection }) => {
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
