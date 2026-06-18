import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: [
      'tests/**/*.test.{js,jsx}',
      'tests/csrf.spec.js',
      'tests/csrf.integration.spec.js',
      'tests/performance.spec.js',
      'tests/e2e/totp.spec.js',
    ],
    exclude: [
      'tests/e2e/auth.spec.js',
      'tests/e2e/socket.spec.js',
      'tests/e2e/map.spec.js',
      'tests/e2e/mount.spec.js',
    ],
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/registerServiceWorker.js',
        'src/**/*.test.{js,jsx}',
      ],
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [75, 90],
        lines: [80, 95],
      },
    },
  },
});
