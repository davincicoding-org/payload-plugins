import { describe, expect, it } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './email-token';

const SECRET = 'test-secret-key-for-hmac';

describe('signUnsubscribeToken', () => {
  it('should produce a string with payload and signature separated by dot', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(token).toBeTypeOf('string');
    expect(token.split('.')).toHaveLength(2);
  });

  it('should produce different tokens for different inputs', () => {
    const a = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const b = signUnsubscribeToken(SECRET, {
      userId: 'user-2',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(a).not.toBe(b);
  });
});

describe('verifyUnsubscribeToken', () => {
  it('should return the payload for a valid token', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const result = verifyUnsubscribeToken(SECRET, token);
    expect(result).toEqual({
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
  });

  it('should return null for a tampered token', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const tampered = `x${token.slice(1)}`;
    expect(verifyUnsubscribeToken(SECRET, tampered)).toBeNull();
  });

  it('should return null for a token signed with a different secret', () => {
    const token = signUnsubscribeToken('wrong-secret', {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(verifyUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it('should return null for malformed input', () => {
    expect(verifyUnsubscribeToken(SECRET, 'not-a-token')).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, '')).toBeNull();
  });

  it('should handle globals without documentId', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'global', slug: 'settings' },
    });
    const result = verifyUnsubscribeToken(SECRET, token);
    expect(result).toEqual({
      userId: 'user-1',
      documentReference: { entity: 'global', slug: 'settings' },
    });
  });
});
