import type { CollectionSlug, Field, GlobalSlug } from 'payload';
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

describe('addRelations → getDependants', () => {
  test('extracts from relationship field', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'author',
        type: 'relationship',
        relationTo: 'users' as CollectionSlug,
        hasMany: false,
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('users' as CollectionSlug);
    expect(dependants).toEqual([
      {
        entity: { type: 'collection', slug: 'posts' },
        fields: [{ field: 'author', hasMany: false, polymorphic: false }],
      },
    ]);
  });

  test('extracts from upload field', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media' as CollectionSlug,
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('media' as CollectionSlug);
    expect(dependants).toEqual([
      {
        entity: { type: 'collection', slug: 'posts' },
        fields: [{ field: 'image', hasMany: false, polymorphic: false }],
      },
    ]);
  });

  test('handles polymorphic (array) relationTo', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'ref',
        type: 'relationship',
        relationTo: ['posts', 'pages'] as CollectionSlug[],
        hasMany: true,
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'home' as CollectionSlug },
      fields,
    );

    const postsDeps = graph.getDependants('posts' as CollectionSlug);
    expect(postsDeps[0]?.fields[0]).toMatchObject({
      polymorphic: true,
      hasMany: true,
    });

    const pagesDeps = graph.getDependants('pages' as CollectionSlug);
    expect(pagesDeps[0]?.fields[0]).toMatchObject({
      polymorphic: true,
      hasMany: true,
    });
  });

  test('recurses into array fields', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'items',
        type: 'array',
        fields: [
          {
            name: 'link',
            type: 'relationship',
            relationTo: 'pages' as CollectionSlug,
            hasMany: false,
          },
        ],
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('pages' as CollectionSlug);
    expect(dependants[0]?.fields[0]).toMatchObject({
      field: 'items.link',
      hasMany: false,
      polymorphic: false,
    });
  });

  test('recurses into group fields', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'meta',
        type: 'group',
        fields: [
          {
            name: 'image',
            type: 'upload',
            relationTo: 'media' as CollectionSlug,
          },
        ],
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('media' as CollectionSlug);
    expect(dependants[0]?.fields[0]).toMatchObject({
      field: 'meta.image',
      hasMany: false,
      polymorphic: false,
    });
  });

  test('recurses into blocks', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [
      {
        name: 'content',
        type: 'blocks',
        blocks: [
          {
            slug: 'cta',
            fields: [
              {
                name: 'link',
                type: 'relationship',
                relationTo: 'pages' as CollectionSlug,
                hasMany: false,
              },
            ],
          },
        ],
      },
    ];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('pages' as CollectionSlug);
    expect(dependants[0]?.fields[0]).toMatchObject({
      field: 'content.link',
      hasMany: false,
      polymorphic: false,
    });
  });

  test('returns empty for fields with no relations', () => {
    const graph = new EntitiesGraph();
    const fields: Field[] = [{ name: 'title', type: 'text' }];

    graph.addRelations(
      { type: 'collection', slug: 'posts' as CollectionSlug },
      fields,
    );

    const dependants = graph.getDependants('anything' as CollectionSlug);
    expect(dependants).toEqual([]);
  });
});
