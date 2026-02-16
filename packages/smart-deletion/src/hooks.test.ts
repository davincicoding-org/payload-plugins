import { describe, expect, test, vi } from 'vitest';

import {
  createHardDeleteHook,
  createRestoreHook,
  createSoftDeleteHook,
} from './hooks';

function createMockReq() {
  return {
    payload: {
      delete: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
    },
  } as any;
}

describe('createHardDeleteHook', () => {
  const hook = createHardDeleteHook({
    path: ['replies'],
    relationTo: 'replies',
  } as any);

  test('hard-deletes referenced docs for hasMany array', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10, 20, 30] },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'replies',
      where: { id: { in: [10, 20, 30] } },
      req,
    });
  });

  test('handles populated objects in hasMany array', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [{ id: 10 }, { id: 20 }] },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'replies',
      where: { id: { in: [10, 20] } },
      req,
    });
  });

  test('handles hasOne relationship (non-array single value)', async () => {
    const singleHook = createHardDeleteHook({
      path: ['author'],
      relationTo: 'users',
    } as any);
    const req = createMockReq();

    await singleHook({
      doc: { id: 1, author: 42 },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: [42] } },
      req,
    });
  });

  test('skips when field is null', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: null },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when field is undefined', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1 },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when field is empty array', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [] },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('resolves nested path through groups', async () => {
    const nestedHook = createHardDeleteHook({
      path: ['meta', 'comments'],
      relationTo: 'comments',
    } as any);
    const req = createMockReq();

    await nestedHook({
      doc: { id: 1, meta: { comments: [10, 20] } },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'comments',
      where: { id: { in: [10, 20] } },
      req,
    });
  });

  test('handles polymorphic hasMany relationship', async () => {
    const polyHook = createHardDeleteHook({
      path: ['owners'],
      relationTo: ['users', 'organizations'],
    } as any);
    const req = createMockReq();

    await polyHook({
      doc: {
        id: 1,
        owners: [
          { relationTo: 'users', value: '123' },
          { relationTo: 'organizations', value: '456' },
          { relationTo: 'users', value: '789' },
        ],
      },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledTimes(2);
    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: ['123', '789'] } },
      req,
    });
    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'organizations',
      where: { id: { in: ['456'] } },
      req,
    });
  });

  test('handles polymorphic hasOne relationship', async () => {
    const polyHook = createHardDeleteHook({
      path: ['owner'],
      relationTo: ['users', 'organizations'],
    } as any);
    const req = createMockReq();

    await polyHook({
      doc: {
        id: 1,
        owner: { relationTo: 'organizations', value: '456' },
      },
      req,
      id: 1,
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).toHaveBeenCalledWith({
      collection: 'organizations',
      where: { id: { in: ['456'] } },
      req,
    });
  });
});

describe('createSoftDeleteHook — soft delete', () => {
  const hook = createSoftDeleteHook({
    path: ['replies'],
    relationTo: 'replies',
  } as any);

  test('soft-deletes referenced docs when parent is trashed', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10, 20], deletedAt: '2025-01-01T00:00:00Z' },
      previousDoc: { id: 1, replies: [10, 20], deletedAt: null },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'replies',
      where: { id: { in: [10, 20] } },
      data: { deletedAt: expect.any(String) },
      req,
    });
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when not an update operation', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10], deletedAt: '2025-01-01T00:00:00Z' },
      previousDoc: { id: 1, replies: [10], deletedAt: null },
      data: {},
      req,
      operation: 'create',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  test('skips when deletedAt was already set (not a transition)', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10], deletedAt: '2025-01-02T00:00:00Z' },
      previousDoc: { id: 1, replies: [10], deletedAt: '2025-01-01T00:00:00Z' },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  test('skips when field is null', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: null, deletedAt: '2025-01-01T00:00:00Z' },
      previousDoc: { id: 1, replies: null, deletedAt: null },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when field is empty array', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [], deletedAt: '2025-01-01T00:00:00Z' },
      previousDoc: { id: 1, replies: [], deletedAt: null },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('handles populated objects in hasMany during soft delete', async () => {
    const req = createMockReq();
    await hook({
      doc: {
        id: 1,
        replies: [{ id: 10 }, { id: 20 }],
        deletedAt: '2025-01-01T00:00:00Z',
      },
      previousDoc: {
        id: 1,
        replies: [{ id: 10 }, { id: 20 }],
        deletedAt: null,
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'replies',
      where: { id: { in: [10, 20] } },
      data: { deletedAt: expect.any(String) },
      req,
    });
  });

  test('handles polymorphic soft delete', async () => {
    const polyHook = createSoftDeleteHook({
      path: ['owners'],
      relationTo: ['users', 'organizations'],
    } as any);
    const req = createMockReq();

    await polyHook({
      doc: {
        id: 1,
        owners: [
          { relationTo: 'users', value: '123' },
          { relationTo: 'organizations', value: '456' },
        ],
        deletedAt: '2025-01-01T00:00:00Z',
      },
      previousDoc: {
        id: 1,
        owners: [
          { relationTo: 'users', value: '123' },
          { relationTo: 'organizations', value: '456' },
        ],
        deletedAt: null,
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledTimes(2);
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: ['123'] } },
      data: { deletedAt: expect.any(String) },
      req,
    });
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'organizations',
      where: { id: { in: ['456'] } },
      data: { deletedAt: expect.any(String) },
      req,
    });
  });
});

describe('createRestoreHook', () => {
  const hook = createRestoreHook({
    path: ['replies'],
    relationTo: 'replies',
  } as any);

  test('restores referenced docs when parent is restored', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10, 20], deletedAt: null },
      previousDoc: {
        id: 1,
        replies: [10, 20],
        deletedAt: '2025-01-01T00:00:00Z',
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'replies',
      where: { id: { in: [10, 20] } },
      data: { deletedAt: null },
      req,
      trash: true,
    });
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when not transitioning from trashed to restored', async () => {
    const req = createMockReq();
    await hook({
      doc: { id: 1, replies: [10], deletedAt: null },
      previousDoc: { id: 1, replies: [10], deletedAt: null },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).not.toHaveBeenCalled();
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('handles hasOne relationship on restore', async () => {
    const singleHook = createRestoreHook({
      path: ['author'],
      relationTo: 'users',
    } as any);
    const req = createMockReq();

    await singleHook({
      doc: { id: 1, author: 42, deletedAt: null },
      previousDoc: {
        id: 1,
        author: 42,
        deletedAt: '2025-01-01T00:00:00Z',
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: [42] } },
      data: { deletedAt: null },
      req,
      trash: true,
    });
  });

  test('handles populated object on restore', async () => {
    const singleHook = createRestoreHook({
      path: ['author'],
      relationTo: 'users',
    } as any);
    const req = createMockReq();

    await singleHook({
      doc: { id: 1, author: { id: 42 }, deletedAt: null },
      previousDoc: {
        id: 1,
        author: { id: 42 },
        deletedAt: '2025-01-01T00:00:00Z',
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: [42] } },
      data: { deletedAt: null },
      req,
      trash: true,
    });
  });

  test('handles polymorphic restore', async () => {
    const polyHook = createRestoreHook({
      path: ['owners'],
      relationTo: ['users', 'organizations'],
    } as any);
    const req = createMockReq();

    await polyHook({
      doc: {
        id: 1,
        owners: [
          { relationTo: 'users', value: '123' },
          { relationTo: 'organizations', value: '456' },
        ],
        deletedAt: null,
      },
      previousDoc: {
        id: 1,
        owners: [
          { relationTo: 'users', value: '123' },
          { relationTo: 'organizations', value: '456' },
        ],
        deletedAt: '2025-01-01T00:00:00Z',
      },
      data: {},
      req,
      operation: 'update',
      collection: { slug: 'posts' } as any,
      context: {},
    });

    expect(req.payload.update).toHaveBeenCalledTimes(2);
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'users',
      where: { id: { in: ['123'] } },
      data: { deletedAt: null },
      req,
      trash: true,
    });
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'organizations',
      where: { id: { in: ['456'] } },
      data: { deletedAt: null },
      req,
      trash: true,
    });
  });
});
