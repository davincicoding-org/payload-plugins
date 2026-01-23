import type { Plugin } from 'payload';

export const localFileStoragePlugin = (): Plugin => (config) => {
  config.collections ??= [];
  config.collections.forEach((collection) => {
    if (!collection.upload) return;
    if (collection.upload === true) {
      collection.upload = {};
    }
    collection.upload.staticDir = `storage/${collection.slug}`;
  });

  return config;
};
