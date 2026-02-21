import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

let payload: Payload;
let devUserId: string | number;

beforeAll(async () => {
  const { default: config } = await import('@payload-config');
  payload = await getPayload({ config });

  // Retrieve the seeded dev user
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: 'dev@test.com' } },
    limit: 1,
  });
  devUserId = docs[0].id;
});

afterAll(async () => {
  await payload.destroy();
});

describe('notifications plugin', () => {
  test('notifications collection is registered', () => {
    const notifications = payload.collections.notifications;
    expect(notifications).toBeDefined();
  });

  test('subscriptions collection is registered', () => {
    const subscriptions = payload.collections.subscriptions;
    expect(subscriptions).toBeDefined();
  });

  test('can create a notification for the dev user', async () => {
    const notification = await payload.create({
      collection: 'notifications',
      data: {
        recipient: devUserId,
        event: 'test.event',
        message: { type: 'static', value: 'Hello from integration test' },
      },
    });

    expect(notification).toBeDefined();
    expect(notification.id).toBeDefined();
    expect(notification.event).toBe('test.event');
    expect(notification.recipient).toBeDefined();
  });

  test('can create a subscription for the dev user', async () => {
    const subscription = await payload.create({
      collection: 'subscriptions',
      data: {
        user: devUserId,
        documentReference: {
          entity: 'collection',
          slug: 'users',
          documentId: String(devUserId),
        },
      },
    });

    expect(subscription).toBeDefined();
    expect(subscription.id).toBeDefined();
  });

  test('can query notifications for the dev user', async () => {
    const { docs, totalDocs } = await payload.find({
      collection: 'notifications',
      where: { recipient: { equals: devUserId } },
    });

    expect(totalDocs).toBeGreaterThanOrEqual(1);
    expect(docs[0].event).toBe('test.event');
  });
});
