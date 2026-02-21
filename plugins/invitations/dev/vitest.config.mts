import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    root: import.meta.dirname,
    include: ['tests/int/**/*.int.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
