import type { CollectionConfig, GlobalConfig } from 'payload';
import { describe, expect, test, vi } from 'vitest';

import type { ResolvedPluginOptions } from '../types';

import { getTrackedCollections } from './tracked-collections';

type Options = ResolvedPluginOptions<'collections' | 'globals'>;

function makeOptions(
  collections: string[] = [],
  globals: string[] = [],
): Options {
  return { collections, globals } as unknown as Options;
}

function makeCollection(
  slug: string,
  fields: CollectionConfig['fields'] = [],
): CollectionConfig {
  return { slug, fields } as CollectionConfig;
}

function makeGlobal(
  slug: string,
  fields: GlobalConfig['fields'] = [],
): GlobalConfig {
  return { slug, fields } as GlobalConfig;
}

describe('getTrackedCollections', () => {
  test('tracks explicitly listed collections', () => {
    const result = getTrackedCollections(makeOptions(['posts', 'pages']), {
      collections: [makeCollection('posts'), makeCollection('pages')],
      globals: [],
    });

    expect(result).toEqual(new Set(['posts', 'pages']));
  });

  test('follows relationship fields recursively', () => {
    const result = getTrackedCollections(makeOptions(['posts']), {
      collections: [
        makeCollection('posts', [
          {
            name: 'author',
            type: 'relationship',
            relationTo: 'users' as any,
          },
        ]),
        makeCollection('users'),
      ],
      globals: [],
    });

    expect(result).toEqual(new Set(['posts', 'users']));
  });

  test('deduplicates collections', () => {
    const result = getTrackedCollections(makeOptions(['posts', 'pages']), {
      collections: [
        makeCollection('posts', [
          {
            name: 'author',
            type: 'relationship',
            relationTo: 'users' as any,
          },
        ]),
        makeCollection('pages', [
          {
            name: 'editor',
            type: 'relationship',
            relationTo: 'users' as any,
          },
        ]),
        makeCollection('users'),
      ],
      globals: [],
    });

    // users should appear once despite being referenced by both
    const arr = Array.from(result);
    expect(arr.filter((s) => s === 'users')).toHaveLength(1);
    expect(result.size).toBe(3);
  });

  test('warns on missing collection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    getTrackedCollections(makeOptions(['missing']), {
      collections: [],
      globals: [],
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Collection to track changes for not found: missing',
      ),
    );
    warn.mockRestore();
  });

  test('warns on missing global', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    getTrackedCollections(makeOptions([], ['missing']), {
      collections: [],
      globals: [],
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Global to track changes for not found: missing'),
    );
    warn.mockRestore();
  });

  test('tracks collections referenced by globals', () => {
    const result = getTrackedCollections(makeOptions([], ['nav']), {
      collections: [makeCollection('pages')],
      globals: [
        makeGlobal('nav', [
          { name: 'items', type: 'relationship', relationTo: 'pages' as any },
        ]),
      ],
    });

    expect(result).toEqual(new Set(['pages']));
  });
});
