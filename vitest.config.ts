import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';
import react from '@vitejs/plugin-react-swc';

// Load environment variables
dotenv.config();

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Use jsdom for component tests, node for RLS tests
    environment: 'jsdom',
    setupFiles: ['./tests/component/setup.ts'],
    include: [
      'tests/component/**/*.test.{ts,tsx}',
      'tests/rls/**/*.test.ts',
      'tests/workflows/**/*.test.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        'src/pages/**/*.{ts,tsx}',
        'src/stores/**/*.ts',
        'src/utils/**/*.ts',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/integrations/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
