import { describe, expect, it } from 'vitest';
import { createLiveMessage } from './builder';
import { resolveMessageAtReadTime, serializeMessage } from './resolve-message';

describe('toMessage', () => {
  it('should store a plain string as static', () => {
    const result = serializeMessage('Hello', { actor: undefined });
    expect(result).toEqual({ type: 'static', value: 'Hello' });
  });

  it('should resolve a MessageFn and store as static', () => {
    const fn = ({ actor }: any) => `${actor.displayName} commented`;
    const result = serializeMessage(fn, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toEqual({ type: 'static', value: 'Jane commented' });
  });

  it('should pass document and meta to MessageFn', () => {
    const fn = ({ actor, document, meta }: any) =>
      `${actor.displayName} did ${meta.action} on ${document.title}`;
    const result = serializeMessage(fn, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
      meta: { action: 'edit' },
    });
    expect(result).toEqual({
      type: 'static',
      value: 'Jane did edit on My Doc',
    });
  });

  it('should store a LiveMessage as dynamic', () => {
    const live = createLiveMessage((t) => t`${t.actor} commented`);
    const result = serializeMessage(live, { actor: undefined });
    expect(result).toEqual({
      type: 'live',
      parts: [{ type: 'actor', field: 'displayName' }, ' commented'],
    });
  });
});

describe('resolveMessageAtReadTime', () => {
  it('should return the value for a static message', () => {
    const result = resolveMessageAtReadTime(
      { type: 'static', value: 'Hello' },
      {},
    );
    expect(result).toBe('Hello');
  });

  it('should resolve actor tokens in a dynamic message', () => {
    const stored = {
      type: 'live' as const,
      parts: [{ type: 'actor' as const, field: 'displayName' }, ' commented'],
    };
    const result = resolveMessageAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toBe('Jane commented');
  });

  it('should resolve document tokens in a dynamic message', () => {
    const stored = {
      type: 'live' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' edited "',
        { type: 'document' as const, field: 'title' },
        '"',
      ],
    };
    const result = resolveMessageAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
    });
    expect(result).toBe('Jane edited "My Doc"');
  });

  it('should resolve meta tokens in a dynamic message', () => {
    const stored = {
      type: 'live' as const,
      parts: ['Action: ', { type: 'meta' as const, field: 'action' }],
    };
    const result = resolveMessageAtReadTime(stored, {
      meta: { action: 'deploy' },
    });
    expect(result).toBe('Action: deploy');
  });

  it('should use empty string for missing token data', () => {
    const stored = {
      type: 'live' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' did something',
      ],
    };
    const result = resolveMessageAtReadTime(stored, {});
    expect(result).toBe(' did something');
  });
});
