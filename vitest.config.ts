import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@drizzle': path.resolve(__dirname, './drizzle'),
    },
  },
  test: {
    globals: true,
    projects: [
      {
        resolve: { alias: { '@': path.resolve(__dirname, './src'), '@drizzle': path.resolve(__dirname, './drizzle') } },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
          coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/server/modules/**/*.ts'],
            exclude: ['src/server/modules/**/index.ts'],
            thresholds: {
              lines: 80,
              branches: 80,
              functions: 80,
              statements: 80,
            },
          },
        },
      },
      {
        resolve: { alias: { '@': path.resolve(__dirname, './src'), '@drizzle': path.resolve(__dirname, './drizzle') } },
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30000,
        },
      },
    ],
  },
});
