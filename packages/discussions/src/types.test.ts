import { describe, expect, test } from 'vitest';

import { createCommentSchema, createReplySchema } from './types';

describe('createCommentSchema', () => {
  test('validates valid input', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello world',
      documentCollectionSlug: 'posts',
      documentId: '123',
    });
    expect(result.success).toBe(true);
  });

  test('validates with numeric documentId', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello world',
      documentCollectionSlug: 'posts',
      documentId: 42,
    });
    expect(result.success).toBe(true);
  });

  test('rejects missing content', () => {
    const result = createCommentSchema.safeParse({
      documentCollectionSlug: 'posts',
      documentId: '123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing documentCollectionSlug', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello',
      documentId: '123',
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing documentId', () => {
    const result = createCommentSchema.safeParse({
      content: 'Hello',
      documentCollectionSlug: 'posts',
    });
    expect(result.success).toBe(false);
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
