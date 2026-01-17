import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Map .js imports to .ts files for proper TypeScript resolution
    },
    extensions: ['.ts', '.js', '.json'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
    // Clear cache to ensure fresh module loading
    clearMocks: true,
  },
});
