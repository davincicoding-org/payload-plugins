import { describe, expect, it } from 'vitest';
import { createNotifications } from './index';

describe('createNotifications', () => {
  it('should return an object with plugin and API methods', () => {
    const notifications = createNotifications({});
    expect(notifications.plugin).toBeTypeOf('function');
    expect(notifications.notify).toBeTypeOf('function');
    expect(notifications.subscribe).toBeTypeOf('function');
    expect(notifications.unsubscribe).toBeTypeOf('function');
    expect(notifications.getSubscribers).toBeTypeOf('function');
  });

  it('should return a valid Payload plugin function', () => {
    const notifications = createNotifications({});
    const plugin = notifications.plugin();
    expect(plugin).toBeTypeOf('function');
  });
});
