import { describe, expect, test } from 'vitest';

import {
  createCommentSchema,
  createReplySchema,
  populatedCommentSchema,
} from './types';

describe('createCommentSchema', () => {
  test('validates valid input', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello world',
      documentReference: { entity: 'collection', slug: 'posts', id: '123' },
    });
    expect(result.success).toBe(true);
  });

  test('validates with numeric documentId', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello world',
      documentReference: { entity: 'collection', slug: 'posts', id: 42 },
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing content', () => {
    const result = createCommentSchema.safeParse({
      documentReference: { entity: 'collection', slug: 'posts', id: '123' },
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing documentReference', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid documentReference', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello',
      documentReference: { slug: 'posts', id: '123' },
    });
    expect(result.success).toBe(false);
  });
});

describe('populatedCommentSchema', () => {
  const validComment = {
    id: 'abc-123',
    content: 'Hello world',
    author: { id: 'user-1', displayName: 'Alice' },
    replies: null,
    updatedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  };

  test('validates with string id', () => {
    const result = populatedCommentSchema.safeParse(validComment);
    expect(result.success).toBe(true);
  });

  test('validates with numeric id', () => {
    const result = populatedCommentSchema.safeParse({
      ...validComment,
      id: 42,
    });
    expect(result.success).toBe(true);
  });

  test('validates with numeric author id', () => {
    const result = populatedCommentSchema.safeParse({
      ...validComment,
      author: { id: 7, displayName: 'Bob' },
    });
    expect(result.success).toBe(true);
  });
});

describe('createReplySchema', () => {
  test('validates valid input', () => {
    const result = createReplySchema.safeParse({
      content: 'Nice post!',
      parentId: 'comment-1',
    });
    expect(result.success).toBe(true);
  });

  test('validates with numeric parentId', () => {
    const result = createReplySchema.safeParse({
      content: 'Nice post!',
      parentId: 42,
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing content', () => {
    const result = createReplySchema.safeParse({
      parentId: 'comment-1',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing parentId', () => {
    const result = createReplySchema.safeParse({
      content: 'Nice post!',
    });
    expect(result.success).toBe(false);
  });
});
