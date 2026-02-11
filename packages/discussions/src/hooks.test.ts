import { describe, expect, test, vi } from 'vitest';

import {
  attachAuthor,
  createDeleteCommentsHooks,
  createDeleteRepliesHooks,
  createRestoreCommentsHooks,
  createSoftDeleteCommentsHooks,
  createSoftDeleteRepliesHooks,
} from './hooks';

function createMockReq() {
  return {
    user: { id: 'user-1' },
    payload: {
      delete: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
    },
  } as any;
}

describe('attachAuthor', () => {
  test('sets author on create', () => {
    const data = { id: '1', author: '' as string | number };
    const result = attachAuthor({
      req: { user: { id: 'user-1' } },
      operation: 'create',
      data,
    } as any);
    expect(result.author).toBe('user-1');
  });

  test('does nothing on update', () => {
    const data = { id: '1', author: 'original' };
    const result = attachAuthor({
      req: { user: { id: 'user-1' } },
      operation: 'update',
      data,
    } as any);
    expect(result.author).toBe('original');
  });
});

describe('createSoftDeleteCommentsHooks', () => {
  const hook = createSoftDeleteCommentsHooks({
    commentsSlug: 'comments' as any,
  });

  test('soft-deletes comments on document soft-delete', async () => {
    const req = createMockReq();
    const data = {
      id: '1',
      discussions: ['c1', 'c2'],
      deletedAt: '2024-01-01',
    };

    await hook({ req, operation: 'update', data } as any);

    expect(req.payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comments',
        where: { id: { in: ['c1', 'c2'] } },
        trash: true,
      }),
    );
  });

  test('skips on non-update', async () => {
    const req = createMockReq();
    const data = { id: '1', discussions: ['c1'], deletedAt: '2024-01-01' };

    const result = await hook({ req, operation: 'create', data } as any);
    expect(result).toBe(data);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when no deletedAt', async () => {
    const req = createMockReq();
    const data = { id: '1', discussions: ['c1'] };

    const result = await hook({ req, operation: 'update', data } as any);
    expect(result).toBe(data);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when no discussions', async () => {
    const req = createMockReq();
    const data = { id: '1', discussions: null, deletedAt: '2024-01-01' };

    const result = await hook({ req, operation: 'update', data } as any);
    expect(result).toBe(data);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when discussions array is empty', async () => {
    const req = createMockReq();
    const data = {
      id: '1',
      discussions: [] as string[],
      deletedAt: '2024-01-01',
    };

    const result = await hook({ req, operation: 'update', data } as any);
    expect(result).toBe(data);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });
});

describe('createRestoreCommentsHooks', () => {
  const hook = createRestoreCommentsHooks({ commentsSlug: 'comments' as any });

  test('restores comments when document restored', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: ['c1', 'c2'], deletedAt: undefined };
    const previousDoc = {
      id: '1',
      discussions: ['c1', 'c2'],
      deletedAt: '2024-01-01',
    };

    await hook({
      doc,
      req,
      operation: 'update',
      previousDoc,
    } as any);

    expect(req.payload.update).toHaveBeenCalledTimes(2);
    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        collection: 'comments',
        data: { deletedAt: undefined },
      }),
    );
  });

  test('skips when not update', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: ['c1'] };
    const previousDoc = {
      id: '1',
      discussions: ['c1'],
      deletedAt: '2024-01-01',
    };

    const result = await hook({
      doc,
      req,
      operation: 'create',
      previousDoc,
    } as any);

    expect(result).toBe(doc);
    expect(req.payload.update).not.toHaveBeenCalled();
  });

  test('skips when not transitioning from deleted', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: ['c1'], deletedAt: '2024-01-01' };
    const previousDoc = {
      id: '1',
      discussions: ['c1'],
      deletedAt: '2024-01-01',
    };

    const result = await hook({
      doc,
      req,
      operation: 'update',
      previousDoc,
    } as any);

    expect(result).toBe(doc);
    expect(req.payload.update).not.toHaveBeenCalled();
  });
});

describe('createDeleteCommentsHooks', () => {
  const hook = createDeleteCommentsHooks({ commentsSlug: 'comments' as any });

  test('hard-deletes comments', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: ['c1', 'c2'] };

    await hook({ doc, req } as any);

    expect(req.payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comments',
        where: { id: { in: ['c1', 'c2'] } },
      }),
    );
  });

  test('skips when no discussions', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: null };

    await hook({ doc, req } as any);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when discussions array is empty', async () => {
    const req = createMockReq();
    const doc = { id: '1', discussions: [] as string[] };

    await hook({ doc, req } as any);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });
});

describe('createSoftDeleteRepliesHooks', () => {
  const hook = createSoftDeleteRepliesHooks({
    commentsSlug: 'comments' as any,
  });

  test('soft-deletes replies', async () => {
    const req = createMockReq();
    const data = { id: '1', replies: ['r1', 'r2'], deletedAt: '2024-01-01' };

    await hook({ req, operation: 'update', data } as any);

    expect(req.payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comments',
        where: { id: { in: ['r1', 'r2'] } },
        trash: true,
      }),
    );
  });

  test('skips on non-update', async () => {
    const req = createMockReq();
    const data = { id: '1', replies: ['r1'], deletedAt: '2024-01-01' };

    const result = await hook({ req, operation: 'create', data } as any);
    expect(result).toBe(data);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when no deletedAt', async () => {
    const req = createMockReq();
    const data = { id: '1', replies: ['r1'] };

    const result = await hook({ req, operation: 'update', data } as any);
    expect(result).toBe(data);
  });

  test('skips when replies is null', async () => {
    const req = createMockReq();
    const data = { id: '1', replies: null, deletedAt: '2024-01-01' };

    const result = await hook({ req, operation: 'update', data } as any);
    expect(result).toBe(data);
  });
});

describe('createDeleteRepliesHooks', () => {
  const hook = createDeleteRepliesHooks({ commentsSlug: 'comments' as any });

  test('hard-deletes replies', async () => {
    const req = createMockReq();
    const doc = { id: '1', replies: ['r1', 'r2'] };

    await hook({ doc, req } as any);

    expect(req.payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comments',
        where: { id: { in: ['r1', 'r2'] } },
      }),
    );
  });

  test('skips when no replies', async () => {
    const req = createMockReq();
    const doc = { id: '1', replies: null };

    await hook({ doc, req } as any);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });

  test('skips when replies array is empty', async () => {
    const req = createMockReq();
    const doc = { id: '1', replies: [] as string[] };

    await hook({ doc, req } as any);
    expect(req.payload.delete).not.toHaveBeenCalled();
  });
});
