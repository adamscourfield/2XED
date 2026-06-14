import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Use the automatic JSX runtime (matches Next's app build) so component files
  // don't need an explicit `import React` to render under jsdom in tests.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
