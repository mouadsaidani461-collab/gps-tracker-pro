import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['tests/**/*.test.{js,jsx}'],
    environment: 'happy-dom',
  },
});
