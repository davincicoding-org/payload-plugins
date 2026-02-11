import { TYPE } from '@formatjs/icu-messageformat-parser';
import { describe, expect, test } from 'vitest';

import {
  parseICUMessage,
  parseIcuToLexicalState,
  serializeICUMessage,
} from './icu-tranform';

describe('parseICUMessage', () => {
  test('parses valid ICU to AST', () => {
    const result = parseICUMessage('Hello {name}');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: TYPE.literal, value: 'Hello ' });
    expect(result[1]).toMatchObject({ type: TYPE.argument, value: 'name' });
  });

  test('parses plain text', () => {
    const result = parseICUMessage('Just text');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: TYPE.literal, value: 'Just text' });
  });
});

describe('serializeICUMessage', () => {
  test('serializes literals', () => {
    const ast = parseICUMessage('Hello world');
    expect(serializeICUMessage(ast)).toBe('Hello world');
  });

  test('serializes arguments', () => {
    const ast = parseICUMessage('{name}');
    expect(serializeICUMessage(ast)).toBe('{name}');
  });

  test('serializes number type', () => {
    const ast = parseICUMessage('{price, number}');
    expect(serializeICUMessage(ast)).toBe('{price, number}');
  });

  test('serializes date type', () => {
    const ast = parseICUMessage('{day, date}');
    expect(serializeICUMessage(ast)).toBe('{day, date}');
  });

  test('serializes time type', () => {
    const ast = parseICUMessage('{hour, time}');
    expect(serializeICUMessage(ast)).toBe('{hour, time}');
  });

  test('serializes select with options', () => {
    const input = '{gender, select, male {He} female {She} other {They}}';
    const ast = parseICUMessage(input);
    const output = serializeICUMessage(ast);
    expect(output).toBe(input);
  });

  test('serializes plural with options', () => {
    const input = '{count, plural, one {# item} other {# items}}';
    const ast = parseICUMessage(input);
    const output = serializeICUMessage(ast);
    expect(output).toBe(input);
  });

  test('serializes tags', () => {
    const input = '<bold>Hello</bold>';
    const ast = parseICUMessage(input);
    const output = serializeICUMessage(ast);
    expect(output).toBe(input);
  });

  test('roundtrips complex messages', () => {
    const input =
      'Hello {name}, you have {count, plural, one {# item} other {# items}}';
    const ast = parseICUMessage(input);
    const output = serializeICUMessage(ast);
    expect(output).toBe(input);
  });
});

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
