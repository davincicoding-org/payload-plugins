import { describe, expect, test } from 'vitest';
import { parseIcuToLexicalState } from './lexical';

describe('parseIcuToLexicalState', () => {
  test('produces correct root structure', () => {
    const state = parseIcuToLexicalState('Hello');
    expect(state.root.type).toBe('root');
    expect(state.root.version).toBe(1);
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0].type).toBe('paragraph');
  });

  test('creates text nodes for literals', () => {
    const state = parseIcuToLexicalState('Hello world');
    const paragraph = state.root.children[0];
    expect(paragraph.children).toHaveLength(1);
    expect(paragraph.children[0]).toMatchObject({
      type: 'text',
      text: 'Hello world',
    });
  });

  test('creates mention nodes for variables', () => {
    const state = parseIcuToLexicalState('Hello {name}');
    const paragraph = state.root.children[0];
    expect(paragraph.children).toHaveLength(2);
    expect(paragraph.children[0]).toMatchObject({
      type: 'text',
      text: 'Hello ',
    });
    expect(paragraph.children[1]).toMatchObject({
      type: 'variableMention',
      trigger: '@',
      value: 'name',
    });
  });

  test('falls back to plain text on parse error', () => {
    const state = parseIcuToLexicalState('{unclosed');
    const paragraph = state.root.children[0];
    expect(paragraph.children).toHaveLength(1);
    expect(paragraph.children[0]).toMatchObject({
      type: 'text',
      text: '{unclosed',
    });
  });
});
