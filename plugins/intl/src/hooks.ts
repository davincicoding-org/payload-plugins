import type { CollectionAfterChangeHook, CollectionConfig } from 'payload';
import type { ResolvedPluginOptions } from './types';

export const createHooks = (
  hooks: ResolvedPluginOptions['hooks'],
): CollectionConfig['hooks'] => {
  if (!hooks) {
    return undefined;
  }
  const { afterUpdate, ...rest } = hooks;
  if (!afterUpdate) {
    return rest;
  }

  const afterUpdateHook: CollectionAfterChangeHook = async ({ operation }) => {
    if (operation === 'update') {
      await afterUpdate();
    }
    return;
  };
  return {
    ...rest,
    afterChange: [...(rest.afterChange ?? []), afterUpdateHook],
  };
};
