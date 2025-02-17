import { defineConfig } from 'vitest/config';

const baseConfig = defineConfig({
  test: {
    globals: true,
    reporters: ['verbose'],
    coverage: {
      reporter: ['text'],
      include: ['src/**/*.ts'],
      exclude: ['src/io/*.ts', 'src/index.ts', 'src/main.ts', 'src/**/*.d.ts'],
    },
  },
});

export default baseConfig;
