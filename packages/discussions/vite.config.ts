import { basePluginConfig } from '@repo/configs/vite';
import { defineConfig, mergeConfig } from 'vite';

export default defineConfig(
  mergeConfig(basePluginConfig(__dirname), {
    build: {
      lib: {
        name: 'PayloadDiscussions',
      },
    },
  }),
);
