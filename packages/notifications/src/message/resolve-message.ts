import { type DocumentID, uncaughtSwitchCase } from '@repo/common';
import type { Notification } from '@/payload-types';
import type {
  LiveMessage,
  LiveMessageToken,
  MessageContext,
  MessageFn,
  ResolvedActor,
} from '../types';

/** Widened context used by internal resolution helpers that don't need the generic. */
type ResolutionContext = {
  actor?: ResolvedActor | null;
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

/**
 * Convert a message input into the shape stored in the database.
 * - Plain strings and MessageFn results become `{ type: 'static', value }`.
 * - LiveMessage objects become `{ type: 'dynamic', parts }`.
 */
export function serializeMessage<Actor extends DocumentID | null>(
  message: string | MessageFn<Actor> | LiveMessage,
  context: Partial<MessageContext<Actor>>,
): Notification['message'] {
  if (typeof message === 'string') {
    return { type: 'static', value: message };
  }

  if (typeof message === 'function') {
    const value = message(context as MessageContext<Actor>);
    return { type: 'static', value };
  }

  return { type: 'live', parts: [...message.parts] };
}

/**
 * Resolve a stored message into a display string.
 * Static messages return their value directly.
 * Dynamic messages resolve each token against the provided context.
 */
export function resolveMessageAtReadTime(
  message: Notification['message'],
  context: ResolutionContext,
): string {
  switch (message.type) {
    case 'static':
      return message.value;
    case 'live':
      return message.parts
        .map((part) => {
          if (typeof part === 'string') return part;
          return resolveToken(part, context);
        })
        .join('');
    default:
      return uncaughtSwitchCase(message);
  }
}

function resolveToken(
  token: LiveMessageToken,
  context: ResolutionContext,
): string {
  switch (token.type) {
    case 'actor': {
      const actor = context.actor;
      if (!actor) return '';
      const value = actor[token.field as keyof ResolvedActor];
      return typeof value === 'string' ? value : String(value ?? '');
    }
    case 'document': {
      const doc = context.document;
      if (!doc) return '';
      const value = doc[token.field];
      return typeof value === 'string' ? value : String(value ?? '');
    }
    case 'meta': {
      const meta = context.meta;
      if (!meta) return '';
      const value = meta[token.field];
      return typeof value === 'string' ? value : String(value ?? '');
    }
    default:
      return uncaughtSwitchCase(token.type);
  }
}
