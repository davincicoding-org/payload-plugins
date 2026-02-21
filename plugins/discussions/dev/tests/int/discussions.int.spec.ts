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

describe('discussions plugin', () => {
  test('comments collection is created', () => {
    const comments = payload.collections.comments;
    expect(comments).toBeDefined();
  });

  test('discussions field is added to feature-requests collection', () => {
    const featureRequests = payload.collections['feature-requests'];
    expect(featureRequests).toBeDefined();

    const fields = featureRequests.config.fields;
    const discussionsField = fields.find(
      (f) => 'name' in f && f.name === 'discussions',
    );
    expect(discussionsField).toBeDefined();
  });

  test('can create a comment directly', async () => {
    // First, get the dev user (seeded by createTestConfig)
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 1,
    });
    expect(users.length).toBeGreaterThan(0);
    const user = users[0];

    const comment = await payload.create({
      collection: 'comments',
      data: {
        content: 'This is a test comment',
        author: user.id,
      },
    });

    expect(comment).toBeDefined();
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe('This is a test comment');
    expect(comment.author).toBeDefined();
  });

  test('can create a feature request with discussions', async () => {
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 1,
    });
    const user = users[0];

    // Create a comment
    const comment = await payload.create({
      collection: 'comments',
      data: {
        content: 'Discussion on feature request',
        author: user.id,
      },
    });

    // Create a feature request and attach the comment
    const featureRequest = await payload.create({
      collection: 'feature-requests',
      data: {
        title: 'Add dark mode',
        createdBy: user.id,
        discussions: [comment.id],
      },
    });

    expect(featureRequest).toBeDefined();
    expect(featureRequest.title).toBe('Add dark mode');

    // Verify the discussion is linked
    const fetched = await payload.findByID({
      collection: 'feature-requests',
      id: featureRequest.id,
      depth: 0,
    });

    expect(fetched.discussions).toBeDefined();
    expect(fetched.discussions).toHaveLength(1);
  });

  test('can create a reply to a comment', async () => {
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 1,
    });
    const user = users[0];

    // Create parent comment
    const parentComment = await payload.create({
      collection: 'comments',
      data: {
        content: 'Parent comment',
        author: user.id,
      },
    });

    // Create reply comment
    const replyComment = await payload.create({
      collection: 'comments',
      data: {
        content: 'Reply to parent',
        author: user.id,
      },
    });

    // Link reply to parent
    await payload.update({
      collection: 'comments',
      id: parentComment.id,
      data: {
        replies: [replyComment.id],
      },
    });

    // Verify the reply is linked
    const updatedParent = await payload.findByID({
      collection: 'comments',
      id: parentComment.id,
      depth: 0,
    });

    expect(updatedParent.replies).toBeDefined();
    expect(updatedParent.replies).toHaveLength(1);
  });
});
