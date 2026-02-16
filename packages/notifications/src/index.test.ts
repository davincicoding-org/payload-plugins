import { describe, expect, it } from 'vitest';
import {
  getSubscribers,
  notificationsPlugin,
  notify,
  subscribe,
  unsubscribe,
} from './index';

describe('notificationsPlugin', () => {
  it('should return a valid Payload plugin function', () => {
    const plugin = notificationsPlugin();
    expect(plugin).toBeTypeOf('function');
  });

  it('should accept custom config options', () => {
    const plugin = notificationsPlugin({
      notificationsSlug: 'my-notifications',
      subscriptionsSlug: 'my-subscriptions',
      pollInterval: 60,
    });
    expect(plugin).toBeTypeOf('function');
  });
});

describe('standalone API functions', () => {
  it('should export notify as a function', () => {
    expect(notify).toBeTypeOf('function');
  });

  it('should export subscribe as a function', () => {
    expect(subscribe).toBeTypeOf('function');
  });

  it('should export unsubscribe as a function', () => {
    expect(unsubscribe).toBeTypeOf('function');
  });

  it('should export getSubscribers as a function', () => {
    expect(getSubscribers).toBeTypeOf('function');
  });
});
