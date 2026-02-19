import type { CollectionSlug } from 'payload';
import { describe, expect, test } from 'vitest';

import { CollectionChanges } from './collection-changes';

describe('CollectionChanges', () => {
  describe('initialize', () => {
    test('populates from queue records', () => {
      const changes = new CollectionChanges();
      changes.initialize([
        {
          id: '1',
          entityType: 'posts',
          entityId: 'p1',
          updatedAt: '',
          createdAt: '',
        },
        {
          id: '2',
          entityType: 'posts',
          entityId: 'p2',
          updatedAt: '',
          createdAt: '',
        },
        {
          id: '3',
          entityType: 'pages',
          entityId: 'pg1',
          updatedAt: '',
          createdAt: '',
        },
      ]);

      expect(changes.get('posts' as CollectionSlug)).toEqual(
        new Set(['p1', 'p2']),
      );
      expect(changes.get('pages' as CollectionSlug)).toEqual(new Set(['pg1']));
    });

    test('skips non-string entityIds', () => {
      const changes = new CollectionChanges();
      changes.initialize([
        {
          id: '1',
          entityType: 'posts',
          entityId: null,
          updatedAt: '',
          createdAt: '',
        },
        {
          id: '2',
          entityType: 'posts',
          entityId: undefined,
          updatedAt: '',
          createdAt: '',
        },
        {
          id: '3',
          entityType: 'pages',
          entityId: 'pg1',
          updatedAt: '',
          createdAt: '',
        },
      ] as any);

      expect(changes.has('posts' as CollectionSlug)).toBe(false);
      expect(changes.get('pages' as CollectionSlug)).toEqual(new Set(['pg1']));
    });
  });

  describe('addItem', () => {
    test('creates new Set for new collection', () => {
      const changes = new CollectionChanges();
      changes.addItem('posts' as CollectionSlug, 'p1');

      expect(changes.get('posts' as CollectionSlug)).toEqual(new Set(['p1']));
    });

    test('adds to existing Set', () => {
      const changes = new CollectionChanges();
      changes.addItem('posts' as CollectionSlug, 'p1');
      changes.addItem('posts' as CollectionSlug, 'p2');

      expect(changes.get('posts' as CollectionSlug)).toEqual(
        new Set(['p1', 'p2']),
      );
    });
  });

  describe('serialize', () => {
    test('converts Sets to arrays', () => {
      const changes = new CollectionChanges();
      changes.addItem('posts' as CollectionSlug, 'p1');
      changes.addItem('posts' as CollectionSlug, 'p2');
      changes.addItem('pages' as CollectionSlug, 'pg1');

      const result = changes.serialize();
      expect(result).toEqual({
        posts: ['p1', 'p2'],
        pages: ['pg1'],
      });
    });

    test('handles empty map', () => {
      const changes = new CollectionChanges();
      expect(changes.serialize()).toEqual({});
    });
  });
});
