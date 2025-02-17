import { buildConfig } from 'eslint-config-spartan';
import { jsDoc, mdx, prettier, typeEnabled, vitest } from 'eslint-config-spartan/mixins';

export default buildConfig(
  typeEnabled({ parserOptions: { tsconfigRootDir: import.meta.dirname, project: './tsconfig.json' } }),
  vitest,
  jsDoc,
  mdx,
  prettier,
  {
    name: 'root/global-ignores',
    ignores: ['test-package/', 'node_modules/', 'coverage/', 'reports/', '.vscode/', 'dist/', '.temp/'],
  },
);
