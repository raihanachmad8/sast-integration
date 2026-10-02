import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@drizzle': path.resolve(__dirname, './drizzle'),
      '@drizzle/*': path.resolve(__dirname, './drizzle/*'),
      '@tests': path.resolve(__dirname, './tests'),
      '@tests/*': path.resolve(__dirname, './tests/*'),
    },
  },
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/server/modules/**/*.ts'],
      exclude: [
        'src/server/modules/**/constants.ts',
        'src/server/modules/**/schemas/**',
        'src/server/modules/**/index.ts',
        'src/server/modules/**/interfaces.ts',
        'src/server/modules/**/types.ts',
        'drizzle/**',
        'src/commons/**',
        'src/server/http/**',
        'src/server/db/**',
        'src/server/env.ts',
      ],
    },
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@drizzle': path.resolve(__dirname, './drizzle'),
            '@drizzle/*': path.resolve(__dirname, './drizzle/*'),
            '@tests': path.resolve(__dirname, './tests'),
            '@tests/*': path.resolve(__dirname, './tests/*'),
          },
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          environment: 'node',
          setupFiles: ['tests/setup.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            '@drizzle': path.resolve(__dirname, './drizzle'),
            '@drizzle/*': path.resolve(__dirname, './drizzle/*'),
            '@tests': path.resolve(__dirname, './tests'),
            '@tests/*': path.resolve(__dirname, './tests/*'),
          },
        },
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
