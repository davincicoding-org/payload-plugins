import { describe, expect, it } from 'vitest';
import { createLiveSubject, isLiveSubject } from './subject';

describe('createLiveSubject', () => {
  it('should create a live subject with actor token', () => {
    const result = createLiveSubject((t) => t`${t.actor} commented`);
    expect(isLiveSubject(result)).toBe(true);
    expect(result.parts).toEqual([
      { type: 'actor', field: 'displayName' },
      ' commented',
    ]);
  });

  it('should create a live subject with document field token', () => {
    const result = createLiveSubject(
      (t) => t`${t.actor} commented on "${t.document('title')}"`,
    );
    expect(result.parts).toEqual([
      { type: 'actor', field: 'displayName' },
      ' commented on "',
      { type: 'document', field: 'title' },
      '"',
    ]);
  });

  it('should create a live subject with meta field token', () => {
    const result = createLiveSubject((t) => t`Action on ${t.meta('itemName')}`);
    expect(result.parts).toEqual([
      'Action on ',
      { type: 'meta', field: 'itemName' },
    ]);
  });

  it('should filter out empty string parts', () => {
    const result = createLiveSubject((t) => t`${t.actor}`);
    expect(result.parts).toEqual([{ type: 'actor', field: 'displayName' }]);
  });
});

describe('isLiveSubject', () => {
  it('should return false for a plain string', () => {
    expect(isLiveSubject('hello')).toBe(false);
  });

  it('should return false for a function', () => {
    expect(isLiveSubject(() => 'hello')).toBe(false);
  });

  it('should return true for a LiveSubject object', () => {
    const result = createLiveSubject((t) => t`${t.actor} did something`);
    expect(isLiveSubject(result)).toBe(true);
  });
});
