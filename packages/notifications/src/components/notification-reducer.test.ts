import { describe, expect, it } from 'vitest';
import type { NotificationData } from '@/types';
import {
  INITIAL_STATE,
  type NotificationState,
  notificationReducer,
} from './notification-reducer';

const makeNotification = (
  overrides: Partial<NotificationData> = {},
): NotificationData => ({
  id: overrides.id ?? '1',
  event: 'test',
  message: 'Test notification',
  readAt: overrides.readAt ?? null,
  documentReference: { entity: 'collection', slug: 'posts' },
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
});

describe('notificationReducer', () => {
  describe('SET_UNREAD', () => {
    it('should replace unread list, set timestamp and hasMore', () => {
      const docs = [makeNotification({ id: '1' })];
      const result = notificationReducer(INITIAL_STATE, {
        type: 'SET_UNREAD',
        docs,
        timestamp: '2026-01-01T00:00:00.000Z',
        hasMore: true,
      });
      expect(result.unread).toEqual(docs);
      expect(result.pollTimestamp).toBe('2026-01-01T00:00:00.000Z');
      expect(result.hasMore).toBe(true);
    });
  });

  describe('PREPEND_UNREAD', () => {
    it('should prepend new docs to existing unread', () => {
      const existing = makeNotification({ id: '1' });
      const newDoc = makeNotification({ id: '2' });
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [existing],
        pollTimestamp: '2026-01-01T00:00:00.000Z',
      };
      const result = notificationReducer(state, {
        type: 'PREPEND_UNREAD',
        docs: [newDoc],
        timestamp: '2026-01-01T00:01:00.000Z',
      });
      expect(result.unread).toEqual([newDoc, existing]);
      expect(result.pollTimestamp).toBe('2026-01-01T00:01:00.000Z');
    });

    it('should not create new array reference when docs is empty', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification()],
      };
      const result = notificationReducer(state, {
        type: 'PREPEND_UNREAD',
        docs: [],
        timestamp: '2026-01-01T00:01:00.000Z',
      });
      expect(result.unread).toBe(state.unread);
    });
  });

  describe('APPEND_READ', () => {
    it('should append docs and update pagination state', () => {
      const docs = [
        makeNotification({ id: '1', readAt: '2026-01-01T00:00:00.000Z' }),
      ];
      const result = notificationReducer(INITIAL_STATE, {
        type: 'APPEND_READ',
        docs,
        hasNextPage: true,
      });
      expect(result.read).toEqual(docs);
      expect(result.readPage).toBe(1);
      expect(result.hasMoreRead).toBe(true);
      expect(result.isReadLoaded).toBe(true);
    });
  });

  describe('MARK_READ', () => {
    it('should remove from unread', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' }), makeNotification({ id: '2' })],
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
        readAt: '2026-01-01T00:05:00.000Z',
      });
      expect(result.unread).toHaveLength(1);
      expect(result.unread[0]!.id).toBe('2');
    });

    it('should prepend to read list when read is loaded', () => {
      const readAt = '2026-01-01T00:05:00.000Z';
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        isReadLoaded: true,
        read: [
          makeNotification({ id: '2', readAt: '2026-01-01T00:00:00.000Z' }),
        ],
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
        readAt,
      });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(2);
      expect(result.read[0]!.id).toBe('1');
      expect(result.read[0]!.readAt).toBe(readAt);
    });

    it('should not add to read list when read is not loaded', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        isReadLoaded: false,
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
        readAt: '2026-01-01T00:05:00.000Z',
      });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(0);
    });

    it('should return same state when id is not found', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: 'nonexistent',
        readAt: '2026-01-01T00:05:00.000Z',
      });
      expect(result).toBe(state);
    });
  });

  describe('MARK_ALL_READ', () => {
    it('should clear unread and reset read list state', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        read: [
          makeNotification({ id: '2', readAt: '2026-01-01T00:00:00.000Z' }),
        ],
        readPage: 2,
        hasMoreRead: false,
        isReadLoaded: true,
      };
      const result = notificationReducer(state, { type: 'MARK_ALL_READ' });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(0);
      expect(result.readPage).toBe(0);
      expect(result.hasMoreRead).toBe(true);
      expect(result.isReadLoaded).toBe(false);
    });
  });

  describe('DELETE_NOTIFICATION', () => {
    it('should remove from unread', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
      };
      const result = notificationReducer(state, {
        type: 'DELETE_NOTIFICATION',
        id: '1',
      });
      expect(result.unread).toHaveLength(0);
    });

    it('should remove from read', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        read: [
          makeNotification({ id: '1', readAt: '2026-01-01T00:00:00.000Z' }),
        ],
      };
      const result = notificationReducer(state, {
        type: 'DELETE_NOTIFICATION',
        id: '1',
      });
      expect(result.read).toHaveLength(0);
    });
  });
});
