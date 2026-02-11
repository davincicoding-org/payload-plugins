import type { Field } from 'payload';
import { describe, expect, test } from 'vitest';

import { findFields, uncaughtSwitchCase } from './utils';

describe('uncaughtSwitchCase', () => {
  test('throws error with the value', () => {
    expect(() => uncaughtSwitchCase('oops' as never)).toThrow(
      'Unhandled switch case: oops',
    );
  });
});

describe('findFields', () => {
  const isRelationship = (
    field: Field,
  ): field is Field & { type: 'relationship' } => field.type === 'relationship';

  test('finds fields at top level', () => {
    const fields: Field[] = [
      { name: 'title', type: 'text' },
      { name: 'author', type: 'relationship', relationTo: 'users' },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('author');
  });

  test('recurses into fields property (group)', () => {
    const fields: Field[] = [
      {
        name: 'meta',
        type: 'group',
        fields: [{ name: 'ref', type: 'relationship', relationTo: 'pages' }],
      },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('ref');
  });

  test('recurses into blocks', () => {
    const fields: Field[] = [
      {
        name: 'content',
        type: 'blocks',
        blocks: [
          {
            slug: 'cta',
            fields: [
              { name: 'link', type: 'relationship', relationTo: 'pages' },
            ],
          },
        ],
      },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('link');
  });

  test('recurses into tabs', () => {
    const fields: Field[] = [
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Settings',
            fields: [
              { name: 'owner', type: 'relationship', relationTo: 'users' },
            ],
          },
        ],
      },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('owner');
  });

  test('returns empty for leaf types with no match', () => {
    const fields: Field[] = [
      { name: 'title', type: 'text' },
      { name: 'count', type: 'number' },
      { name: 'active', type: 'checkbox' },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(0);
  });

  test('handles mixed nesting', () => {
    const fields: Field[] = [
      { name: 'top', type: 'relationship', relationTo: 'a' },
      {
        name: 'group',
        type: 'group',
        fields: [
          { name: 'nested', type: 'relationship', relationTo: 'b' },
          { name: 'text', type: 'text' },
        ],
      },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Tab',
            fields: [
              {
                name: 'blocks',
                type: 'blocks',
                blocks: [
                  {
                    slug: 'block',
                    fields: [
                      { name: 'deep', type: 'relationship', relationTo: 'c' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const result = findFields(fields, isRelationship);
    expect(result).toHaveLength(3);
    expect(result.map((f) => f.name)).toEqual(['top', 'nested', 'deep']);
  });
});
