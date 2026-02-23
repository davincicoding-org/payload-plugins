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
  test('afterChange hooks are attached to tracked collections', () => {
    const posts = payload.collections.posts;
    expect(posts.config.hooks?.afterChange?.length).toBeGreaterThanOrEqual(1);
  });

  test('afterDelete hooks are attached to tracked collections', () => {
    const posts = payload.collections.posts;
    expect(posts.config.hooks?.afterDelete?.length).toBeGreaterThanOrEqual(1);
  });

  test('auto-tracked relationship collections also get hooks', () => {
    // 'comments' is not explicitly configured, but 'posts' has a
    // relationship to 'comments', so it should be auto-tracked.
    const comments = payload.collections.comments;
    expect(comments.config.hooks?.afterChange?.length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
