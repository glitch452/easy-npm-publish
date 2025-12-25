import { defineConfig } from 'vitest/config';

const baseConfig = defineConfig({
  test: {
    globals: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types', 'src/**/*.d.ts'],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
});

export default baseConfig;
