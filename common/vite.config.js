import { resolve } from 'node:path';
import preserveDirectives from 'rollup-preserve-directives';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * @param {string} pluginDir
 */
export const basePluginConfig = (pluginDir) => {
  return defineConfig({
    plugins: [
      tsconfigPaths({
        ignoreConfigErrors: true,
      }),
      preserveDirectives(),
      dts({
        include: ['src/**/*'],
        exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
        outDir: 'dist',
        insertTypesEntry: true,
        entryRoot: 'src',
      }),
    ],
    build: {
      lib: {
        entry: {
          index: resolve(pluginDir, 'src/index.ts'),
          'exports/rsc': resolve(pluginDir, 'src/exports/rsc.ts'),
        },
        formats: ['es'],

        fileName: (_, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        // IMPROVED EXTERNAL LOGIC
        /** @type {(id: string) => boolean} */
        external: (id) => {
          const isRelative = id.startsWith('.') || id.startsWith('/');
          const isAlias = id.startsWith('@/');
          // Ensure we don't bundle dependencies (payload, react, etc.)
          return !isRelative && !isAlias;
        },
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src',
          /** @type {(assetInfo: { name?: string }) => string} */
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'styles.css';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  });
};
