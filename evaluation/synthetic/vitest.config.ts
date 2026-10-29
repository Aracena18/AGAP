import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['evaluation/synthetic/tests/**/*.test.ts'], fileParallelism: false } });
