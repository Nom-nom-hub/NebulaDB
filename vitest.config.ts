import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      './packages/*/tests/**/*.test.ts',
      './packages/*/src/**/*.test.ts',
      './tools/*/src/test/**/*.test.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '**/._*.test.ts',  // Exclude macOS hidden files
      '**/._*',          // Exclude all macOS hidden files
      '**/.DS_Store'     // Exclude macOS .DS_Store files
    ],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      all: true,
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**', '**/*.d.ts'],
      reporter: ['text', 'html'],
    }
  },
  resolve: {
    alias: {
      '@nebula/core': resolve(__dirname, './packages/core/src'),
      '@nebula/adapter-memory': resolve(__dirname, './packages/adapters/memory/src'),
      '@nebula/adapter-localstorage': resolve(__dirname, './packages/adapters/localstorage/src'),
      '@nebula/adapter-indexeddb': resolve(__dirname, './packages/adapters/indexeddb/src'),
      '@nebula/adapter-filesystem': resolve(__dirname, './packages/adapters/filesystem/src'),
      '@nebula/plugin-encryption': resolve(__dirname, './packages/plugins/encryption/src'),
      '@nebula/plugin-validation': resolve(__dirname, './packages/plugins/validation/src'),
      '@nebula/plugin-versioning': resolve(__dirname, './packages/plugins/versioning/src')
    }
  }
});
