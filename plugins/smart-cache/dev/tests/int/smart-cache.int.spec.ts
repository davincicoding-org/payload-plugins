import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

let payload: Payload;

beforeAll(async () => {
  const { default: config } = await import('@payload-config');
  payload = await getPayload({ config });
});

afterAll(async () => {
  await payload.destroy();
});

describe('smart-cache plugin', () => {
  test('publish-queue collection is created by the plugin', () => {
    const publishQueue = payload.collections['publish-queue'];
    expect(publishQueue).toBeDefined();
  });

  test('changes to tracked collections are tracked in publish-queue', async () => {
    // Create a post (tracked collection)
    const post = await payload.create({
      collection: 'posts',
      data: { title: 'Test Post' },
    });

    // Check that a publish-queue entry was created
    const { docs } = await payload.find({
      collection: 'publish-queue',
      where: {
        and: [
          { entityType: { equals: 'posts' } },
          { entityId: { equals: post.id.toString() } },
        ],
      },
    });

    expect(docs.length).toBeGreaterThanOrEqual(1);
  });

  test('deleting a tracked document creates a publish-queue entry', async () => {
    // Create a post
    const post = await payload.create({
      collection: 'posts',
      data: { title: 'Post to Delete' },
    });

    // Clear any existing queue entries for this entity
    const { docs: existingDocs } = await payload.find({
      collection: 'publish-queue',
      where: {
        and: [
          { entityType: { equals: 'posts' } },
          { entityId: { equals: post.id.toString() } },
        ],
      },
    });
    for (const doc of existingDocs) {
      await payload.delete({ collection: 'publish-queue', id: doc.id });
    }

    // Delete the post
    await payload.delete({ collection: 'posts', id: post.id });

    // Verify a new publish-queue entry was created for the deletion
    const { docs } = await payload.find({
      collection: 'publish-queue',
      where: {
        and: [
          { entityType: { equals: 'posts' } },
          { entityId: { equals: post.id.toString() } },
        ],
      },
    });

    expect(docs.length).toBeGreaterThanOrEqual(1);
  });
});
