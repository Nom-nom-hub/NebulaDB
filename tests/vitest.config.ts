import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      '**/._*',          // Exclude all macOS hidden files
      '**/.DS_Store'     // Exclude macOS .DS_Store files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        resolve(__dirname, '../packages/core/src/**/*.ts'),
        resolve(__dirname, '../packages/adapters/*/src/**/*.ts'),
        resolve(__dirname, '../packages/plugins/*/src/**/*.ts')
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        // Don't exclude index.ts as it might contain important exports
      ],
      all: true,
      reportsDirectory: './coverage',
      enabled: true,
      clean: true,
      cleanOnRerun: true,
      skipFull: false,
      // Explicitly include transaction.ts for coverage
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      '@nebula/core': resolve(__dirname, '../packages/core/src'),
      '@nebula/adapter-memory': resolve(__dirname, '../packages/adapters/memory/src'),
      '@nebula/adapter-sqlite': resolve(__dirname, '../packages/adapters/sqlite/src'),
      '@nebula/plugin-cache': resolve(__dirname, '../packages/plugins/cache/src'),
      '@nebula/plugin-validation': resolve(__dirname, '../packages/plugins/validation/src')
    }
  }
});
