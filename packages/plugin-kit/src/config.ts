import type { CollectionConfig, Config } from 'payload';

export const createCollectionConfigFactory =
  <T extends Record<string, unknown>>(
    factory:
      | Omit<CollectionConfig, 'slug'>
      | ((options: T & { slug: string }) => Omit<CollectionConfig, 'slug'>),
  ) =>
  (options: T & { slug: string }): CollectionConfig => ({
    slug: options.slug,
    ...(typeof factory === 'function' ? factory(options) : factory),
  });

/** Any Zod-like schema that has safeParse and infer support. */
interface ZodLike<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

export const createPluginContext = <T>(
  pluginName: `payload-${string}`,
  schema: ZodLike<T>,
) => ({
  set: (config: Config, context: T) => {
    config.custom ??= {};
    config.custom[pluginName] = context;
  },
  get: (config: { custom?: Record<string, unknown> }): T | null => {
    const result = schema.safeParse(config.custom?.[pluginName]);
    if (!result.success) return null;
    return result.data;
  },
});
