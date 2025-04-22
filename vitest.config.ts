import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/']
    }
  },
  resolve: {
    alias: {
      '@nebula/core': './packages/core/src',
      '@nebula/adapter-memory': './packages/adapters/memory/src',
      '@nebula/adapter-localstorage': './packages/adapters/localstorage/src',
      '@nebula/adapter-indexeddb': './packages/adapters/indexeddb/src',
      '@nebula/adapter-filesystem': './packages/adapters/filesystem/src',
      '@nebula/plugin-encryption': './packages/plugins/encryption/src',
      '@nebula/plugin-validation': './packages/plugins/validation/src',
      '@nebula/plugin-versioning': './packages/plugins/versioning/src'
    }
  }
});
