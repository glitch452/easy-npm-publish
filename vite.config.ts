import path from 'path';
import { defineConfig } from 'vitest/config';

const baseConfig = defineConfig({
  resolve: {
    alias: {
      src: path.resolve('./src'),
    },
  },
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
