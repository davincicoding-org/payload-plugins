import type { NotificationData } from '@/types';

export interface NotificationState {
  unread: NotificationData[];
  read: NotificationData[];
  readPage: number;
  hasMoreRead: boolean;
  hasMore: boolean;
  isReadLoaded: boolean;
  pollTimestamp: string | null;
}

export const INITIAL_STATE: NotificationState = {
  unread: [],
  read: [],
  readPage: 0,
  hasMoreRead: true,
  hasMore: false,
  isReadLoaded: false,
  pollTimestamp: null,
};

export type NotificationAction =
  | {
      type: 'SET_UNREAD';
      docs: NotificationData[];
      timestamp: string;
      hasMore: boolean;
    }
  | { type: 'PREPEND_UNREAD'; docs: NotificationData[]; timestamp: string }
  | {
      type: 'APPEND_READ';
      docs: NotificationData[];
      hasNextPage: boolean;
    }
  | { type: 'MARK_READ'; id: string | number; readAt: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'DELETE_NOTIFICATION'; id: string | number };

export function notificationReducer(
  state: NotificationState,
  action: NotificationAction,
): NotificationState {
  switch (action.type) {
    case 'SET_UNREAD':
      return {
        ...state,
        unread: action.docs,
        hasMore: action.hasMore,
        pollTimestamp: action.timestamp,
      };

    case 'PREPEND_UNREAD':
      return {
        ...state,
        unread:
          action.docs.length > 0
            ? [...action.docs, ...state.unread]
            : state.unread,
        pollTimestamp: action.timestamp,
      };

    case 'APPEND_READ':
      return {
        ...state,
        read: [...state.read, ...action.docs],
        readPage: state.readPage + 1,
        hasMoreRead: action.hasNextPage,
        isReadLoaded: true,
      };

    case 'MARK_READ': {
      const item = state.unread.find((n) => n.id === action.id);
      if (!item) return state;
      return {
        ...state,
        unread: state.unread.filter((n) => n.id !== action.id),
        read: state.isReadLoaded
          ? [{ ...item, readAt: action.readAt }, ...state.read]
          : state.read,
        hasMore: true,
      };
    }

    case 'MARK_ALL_READ':
      return {
        ...state,
        unread: [],
        read: [],
        readPage: 0,
        hasMoreRead: true,
        isReadLoaded: false,
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        unread: state.unread.filter((n) => n.id !== action.id),
        read: state.read.filter((n) => n.id !== action.id),
      };
  }
}
