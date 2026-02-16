import { describe, expect, test } from 'vitest';

import { attachAuthor } from './hooks';

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
