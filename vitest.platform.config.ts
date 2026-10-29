import { defineConfig } from 'vitest/config';
export default defineConfig({ oxc: { decorator: { legacy: true } }, test: { environment: 'node', include: ['apps/**/*.test.ts', 'packages/**/*.test.ts'], fileParallelism: false, testTimeout: 15000, hookTimeout: 30000 } });
