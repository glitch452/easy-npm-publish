import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const baseConfig = defineConfig({
  resolve: {
    alias: {
      __mocks__: fileURLToPath(new URL('__mocks__', import.meta.url)),
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
