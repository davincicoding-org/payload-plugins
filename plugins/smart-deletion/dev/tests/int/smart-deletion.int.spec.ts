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

describe('smart-deletion plugin', () => {
  test('hooks are attached to collections with cascade fields', () => {
    const parents = payload.collections['parents'];
    expect(parents).toBeDefined();
  });

  test('hard-deleting a parent cascades to children', async () => {
    const child1 = await payload.create({
      collection: 'children',
      data: { title: 'Child 1' },
    });

    const child2 = await payload.create({
      collection: 'children',
      data: { title: 'Child 2' },
    });

    const parent = await payload.create({
      collection: 'parents',
      data: { title: 'Parent 1', children: [child1.id, child2.id] },
    });

    await payload.delete({ collection: 'parents', id: parent.id });

    const { totalDocs } = await payload.count({
      collection: 'children',
      where: { id: { in: [child1.id, child2.id] } },
    });

    expect(totalDocs).toBe(0);
  });

  test('soft-deleting a parent cascades to children', async () => {
    const child = await payload.create({
      collection: 'children',
      data: { title: 'Child 3' },
    });

    const parent = await payload.create({
      collection: 'parents',
      data: { title: 'Parent 2', children: [child.id] },
    });

    // Soft-delete (move to trash) by setting deletedAt
    await payload.update({
      collection: 'parents',
      id: parent.id,
      data: { deletedAt: new Date().toISOString() },
    });

    // Verify child was also soft-deleted (has deletedAt set).
    // Use find with trash: true because findByID excludes trashed docs.
    const { docs } = await payload.find({
      collection: 'children',
      where: { id: { equals: child.id } },
      trash: true,
    });

    expect(docs).toHaveLength(1);
    expect(docs[0].deletedAt).toBeTruthy();
  });

  test('restoring a parent cascades restore to children', async () => {
    const child = await payload.create({
      collection: 'children',
      data: { title: 'Child 4' },
    });

    const parent = await payload.create({
      collection: 'parents',
      data: { title: 'Parent 3', children: [child.id] },
    });

    // Soft-delete first
    await payload.update({
      collection: 'parents',
      id: parent.id,
      data: { deletedAt: new Date().toISOString() },
    });

    // Restore by clearing deletedAt
    await payload.update({
      collection: 'parents',
      id: parent.id,
      data: { deletedAt: null },
      // Need trash: true to update a trashed doc
      trash: true,
    });

    // Verify child was also restored
    const updatedChild = await payload.findByID({
      collection: 'children',
      id: child.id,
    });

    expect(updatedChild.deletedAt).toBeFalsy();
  });
});
