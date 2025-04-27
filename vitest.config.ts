import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      './packages/*/tests/**/*.test.ts',
      './packages/*/src/**/*.test.ts',
      './tests/unit/**/*.test.ts',
      './tools/*/src/test/**/*.test.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '**/._*.test.ts',  // Exclude macOS hidden files
      '**/._*',          // Exclude all macOS hidden files
      '**/.DS_Store'     // Exclude macOS .DS_Store files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        './packages/core/src/**/*.ts',
        './packages/adapters/*/src/**/*.ts',
        './packages/plugins/*/src/**/*.ts'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/index.ts'
      ],
      all: true,
      reportsDirectory: './coverage',
      enabled: true,
      clean: true,
      cleanOnRerun: true,
      skipFull: false
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
