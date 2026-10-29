import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    reporters: ['verbose'],
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    testTimeout: 10000,
  },
});
