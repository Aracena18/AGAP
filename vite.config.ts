import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs:{allow:[fileURLToPath(new URL('.',import.meta.url)),realpathSync(fileURLToPath(new URL('./node_modules',import.meta.url)))]}, proxy: { '/api': { target: process.env.AGAP_API_TARGET ?? 'http://127.0.0.1:4100', changeOrigin: false } } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.worktrees'],
  },
});
