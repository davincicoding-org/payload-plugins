import type { CollectionConfig, Config } from 'payload';
import { describe, expect, test, vi } from 'vitest';

import { smartDeletionPlugin } from './index';

function createConfig(collections: CollectionConfig[]): Config {
  return { collections } as Config;
}

/** Apply the plugin synchronously and return the resulting Config. */
function applyPlugin(
  config: Config,
  options?: Parameters<typeof smartDeletionPlugin>[0],
): Config {
  return smartDeletionPlugin(options)(config) as Config;
}

describe('smartDeletionPlugin', () => {
  test('attaches hooks to collection with cascade field', () => {
    const config = createConfig([
      {
        slug: 'posts',
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
        ],
      },
      {
        slug: 'replies',
        fields: [{ name: 'text', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config);
    const posts = result.collections?.find((c) => c.slug === 'posts');

    expect(posts?.hooks?.afterDelete).toHaveLength(1);
    expect(posts?.hooks?.afterChange).toHaveLength(0);
  });

  test('does not attach hooks to collections without cascade fields', () => {
    const config = createConfig([
      {
        slug: 'posts',
        fields: [
          {
            name: 'author',
            type: 'relationship',
            relationTo: 'users',
          },
        ],
      },
      {
        slug: 'users',
        fields: [{ name: 'name', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config);
    const posts = result.collections?.find((c) => c.slug === 'posts');

    expect(posts?.hooks?.afterDelete ?? []).toHaveLength(0);
    expect(posts?.hooks?.afterChange ?? []).toHaveLength(0);
  });

  test('auto-enables trash on target when source has trash', () => {
    const config = createConfig([
      {
        slug: 'posts',
        trash: true,
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
        ],
      },
      {
        slug: 'replies',
        fields: [{ name: 'text', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config, { autoEnableTrash: true });
    const replies = result.collections?.find((c) => c.slug === 'replies');

    expect(replies?.trash).toBe(true);
  });

  test('does not auto-enable trash when source does not have trash', () => {
    const config = createConfig([
      {
        slug: 'posts',
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
        ],
      },
      {
        slug: 'replies',
        fields: [{ name: 'text', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config);
    const replies = result.collections?.find((c) => c.slug === 'replies');

    expect(replies?.trash).toBeUndefined();
  });

  test('warns when autoEnableTrash is false and target lacks trash', () => {
    const config = createConfig([
      {
        slug: 'posts',
        trash: true,
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
        ],
      },
      {
        slug: 'replies',
        fields: [{ name: 'text', type: 'text' }],
      },
    ]);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    applyPlugin(config, { autoEnableTrash: false });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Collection "replies" does not have `trash: true`',
      ),
    );
    warnSpy.mockRestore();
  });

  test('finds cascade fields inside nested structures (groups, tabs)', () => {
    const config = createConfig([
      {
        slug: 'articles',
        fields: [
          {
            type: 'group',
            name: 'meta',
            fields: [
              {
                name: 'comments',
                type: 'relationship',
                relationTo: 'comments',
                hasMany: true,
                custom: { smartDeletion: 'cascade' },
              },
            ],
          },
          {
            type: 'tabs',
            tabs: [
              {
                label: 'Details',
                fields: [
                  {
                    name: 'attachments',
                    type: 'relationship',
                    relationTo: 'attachments',
                    hasMany: true,
                    custom: { smartDeletion: 'cascade' },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        slug: 'comments',
        fields: [{ name: 'text', type: 'text' }],
      },
      {
        slug: 'attachments',
        fields: [{ name: 'url', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config);
    const articles = result.collections?.find((c) => c.slug === 'articles');

    expect(articles?.hooks?.afterDelete).toHaveLength(2);
    expect(articles?.hooks?.afterChange).toHaveLength(0);
  });

  test('handles multiple cascade fields on one collection', () => {
    const config = createConfig([
      {
        slug: 'threads',
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
          {
            name: 'reactions',
            type: 'relationship',
            relationTo: 'reactions',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
          {
            name: 'author',
            type: 'relationship',
            relationTo: 'users',
          },
        ],
      },
      {
        slug: 'replies',
        fields: [{ name: 'text', type: 'text' }],
      },
      {
        slug: 'reactions',
        fields: [{ name: 'emoji', type: 'text' }],
      },
      {
        slug: 'users',
        fields: [{ name: 'name', type: 'text' }],
      },
    ]);

    const result = applyPlugin(config);
    const threads = result.collections?.find((c) => c.slug === 'threads');

    expect(threads?.hooks?.afterDelete).toHaveLength(2);
    expect(threads?.hooks?.afterChange).toHaveLength(0);
  });

  test('does not throw when autoEnableTrash is false but target already has trash', () => {
    const config = createConfig([
      {
        slug: 'posts',
        trash: true,
        fields: [
          {
            name: 'replies',
            type: 'relationship',
            relationTo: 'replies',
            hasMany: true,
            custom: { smartDeletion: 'cascade' },
          },
        ],
      },
      {
        slug: 'replies',
        trash: true,
        fields: [{ name: 'text', type: 'text' }],
      },
    ]);

    expect(() => applyPlugin(config, { autoEnableTrash: false })).not.toThrow();

    const result = applyPlugin(config, { autoEnableTrash: false });
    const replies = result.collections?.find((c) => c.slug === 'replies');
    expect(replies?.trash).toBe(true);
  });
});
