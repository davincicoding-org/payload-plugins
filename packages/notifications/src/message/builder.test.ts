import { describe, expect, it } from 'vitest';
import { createLiveMessage } from './builder';

describe('createLiveMessage', () => {
  it('should create a live message with actor token', () => {
    const result = createLiveMessage((t) => t`${t.actor} commented`);
    expect(result).toEqual({
      type: 'live',
      parts: [{ type: 'actor', field: 'displayName' }, ' commented'],
    });
  });

  it('should create a live message with document field token', () => {
    const result = createLiveMessage(
      (t) => t`${t.actor} commented on "${t.document('title')}"`,
    );
    expect(result.parts).toEqual([
      { type: 'actor', field: 'displayName' },
      ' commented on "',
      { type: 'document', field: 'title' },
      '"',
    ]);
  });

  it('should create a live message with meta field token', () => {
    const result = createLiveMessage((t) => t`Action on ${t.meta('itemName')}`);
    expect(result.parts).toEqual([
      'Action on ',
      { type: 'meta', field: 'itemName' },
    ]);
  });

  it('should filter out empty string parts', () => {
    const result = createLiveMessage((t) => t`${t.actor}`);
    expect(result.parts).toEqual([{ type: 'actor', field: 'displayName' }]);
  });
});
