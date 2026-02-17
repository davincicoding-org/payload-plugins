import { describe, expect, it } from 'vitest';
import { resolveSubjectAtReadTime, toStoredSubject } from './resolve-subject';
import { createLiveSubject } from './subject';

describe('toStoredSubject', () => {
  it('should store a plain string as static', () => {
    const result = toStoredSubject('Hello', { actor: undefined });
    expect(result).toEqual({ type: 'static', value: 'Hello' });
  });

  it('should resolve a SubjectFn and store as static', () => {
    const fn = ({ actor }: any) => `${actor.displayName} commented`;
    const result = toStoredSubject(fn, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toEqual({ type: 'static', value: 'Jane commented' });
  });

  it('should pass document and meta to SubjectFn', () => {
    const fn = ({ actor, document, meta }: any) =>
      `${actor.displayName} did ${meta.action} on ${document.title}`;
    const result = toStoredSubject(fn, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
      meta: { action: 'edit' },
    });
    expect(result).toEqual({
      type: 'static',
      value: 'Jane did edit on My Doc',
    });
  });

  it('should store a LiveSubject as dynamic', () => {
    const live = createLiveSubject((t) => t`${t.actor} commented`);
    const result = toStoredSubject(live, { actor: undefined });
    expect(result).toEqual({
      type: 'dynamic',
      parts: [{ type: 'actor', field: 'displayName' }, ' commented'],
    });
  });
});

describe('resolveSubjectAtReadTime', () => {
  it('should return the value for a static subject', () => {
    const result = resolveSubjectAtReadTime(
      { type: 'static', value: 'Hello' },
      {},
    );
    expect(result).toBe('Hello');
  });

  it('should resolve actor tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [{ type: 'actor' as const, field: 'displayName' }, ' commented'],
    };
    const result = resolveSubjectAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toBe('Jane commented');
  });

  it('should resolve document tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' edited "',
        { type: 'document' as const, field: 'title' },
        '"',
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
    });
    expect(result).toBe('Jane edited "My Doc"');
  });

  it('should resolve meta tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: ['Action: ', { type: 'meta' as const, field: 'action' }],
    };
    const result = resolveSubjectAtReadTime(stored, {
      meta: { action: 'deploy' },
    });
    expect(result).toBe('Action: deploy');
  });

  it('should use empty string for missing token data', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' did something',
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {});
    expect(result).toBe(' did something');
  });
});
