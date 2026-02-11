import type { CollectionSlug, FlattenedField, GlobalSlug } from 'payload';
import { describe, expect, test } from 'vitest';

import { EntitiesGraph } from './dependency-graph';

describe('EntitiesGraph.parseEntityReference', () => {
  test('parses collection reference', () => {
    const result = EntitiesGraph.parseEntityReference(
      'collection|posts' as any,
    );
    expect(result).toEqual({ type: 'collection', slug: 'posts' });
  });

  test('parses global reference', () => {
    const result = EntitiesGraph.parseEntityReference('global|settings' as any);
    expect(result).toEqual({ type: 'global', slug: 'settings' });
  });

  test('throws on invalid reference', () => {
    expect(() =>
      EntitiesGraph.parseEntityReference('invalid|test' as any),
    ).toThrow('Invalid entity reference');
  });
});

describe('EntitiesGraph.stringifyEntityReference', () => {
  test('stringifies collection reference', () => {
    const result = EntitiesGraph.stringifyEntityReference({
      type: 'collection',
      slug: 'posts' as CollectionSlug,
    });
    expect(result).toBe('collection|posts');
  });

  test('stringifies global reference', () => {
    const result = EntitiesGraph.stringifyEntityReference({
      type: 'global',
      slug: 'settings' as GlobalSlug,
    });
    expect(result).toBe('global|settings');
  });
});

describe('EntitiesGraph roundtrip', () => {
  test('stringify then parse returns same entity', () => {
    const entity = {
      type: 'collection' as const,
      slug: 'posts' as CollectionSlug,
    };
    const stringified = EntitiesGraph.stringifyEntityReference(entity);
    const parsed = EntitiesGraph.parseEntityReference(stringified);
    expect(parsed).toEqual(entity);
  });
});

describe('EntitiesGraph.getFieldRelations', () => {
  test('extracts from relationship field', () => {
    const field = {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([
      {
        field: 'author',
        collection: 'users',
        hasMany: false,
        polymorphic: false,
      },
    ]);
  });

  test('extracts from upload field', () => {
    const field = {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([
      {
        field: 'image',
        collection: 'media',
        hasMany: false,
        polymorphic: false,
      },
    ]);
  });

  test('handles polymorphic (array) relationTo', () => {
    const field = {
      name: 'ref',
      type: 'relationship',
      relationTo: ['posts', 'pages'],
      hasMany: true,
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      collection: 'posts',
      polymorphic: true,
      hasMany: true,
    });
    expect(result[1]).toMatchObject({
      collection: 'pages',
      polymorphic: true,
      hasMany: true,
    });
  });

  test('recurses into array fields', () => {
    const field = {
      name: 'items',
      type: 'array',
      flattenedFields: [
        {
          name: 'link',
          type: 'relationship',
          relationTo: 'pages',
          hasMany: false,
        },
      ],
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([
      {
        field: 'items.link',
        collection: 'pages',
        hasMany: false,
        polymorphic: false,
      },
    ]);
  });

  test('recurses into group fields', () => {
    const field = {
      name: 'meta',
      type: 'group',
      flattenedFields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([
      {
        field: 'meta.image',
        collection: 'media',
        hasMany: false,
        polymorphic: false,
      },
    ]);
  });

  test('recurses into blocks', () => {
    const field = {
      name: 'content',
      type: 'blocks',
      blocks: [
        {
          slug: 'cta',
          flattenedFields: [
            {
              name: 'link',
              type: 'relationship',
              relationTo: 'pages',
              hasMany: false,
            },
          ],
        },
      ],
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([
      {
        field: 'content.link',
        collection: 'pages',
        hasMany: false,
        polymorphic: false,
      },
    ]);
  });

  test('returns empty for leaf types', () => {
    const field = {
      name: 'title',
      type: 'text',
    } as unknown as FlattenedField;

    const result = EntitiesGraph.getFieldRelations(field, []);
    expect(result).toEqual([]);
  });
});
