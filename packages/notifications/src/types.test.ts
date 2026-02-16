import { describe, expect, it } from 'vitest';
import { notifyInputSchema } from './types';

describe('notifyInputSchema', () => {
  it('should validate a complete notification input', () => {
    const result = notifyInputSchema.safeParse({
      recipient: 'user-1',
      event: 'comment.created',
      actor: { id: 'user-2', displayName: 'Alice' },
      subject: 'Alice commented on your post',
      url: '/admin/collections/feature-requests/123',
      meta: { commentId: 'abc' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate without optional fields', () => {
    const result = notifyInputSchema.safeParse({
      recipient: 'user-1',
      event: 'comment.created',
      actor: { id: 'user-2', displayName: 'Alice' },
      subject: 'Alice commented on your post',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = notifyInputSchema.safeParse({ recipient: 'user-1' });
    expect(result.success).toBe(false);
  });
});
