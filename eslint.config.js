import { buildConfig } from 'eslint-config-spartan';
import {
  jsDoc,
  mdx,
  namingConvention,
  prettier,
  promise,
  typeEnabled,
  unicorn,
  vitest,
} from 'eslint-config-spartan/mixins';
import { files } from 'eslint-config-spartan/utils';

export default buildConfig(
  typeEnabled({ parserOptions: { tsconfigRootDir: import.meta.dirname, projectService: true } }),
  namingConvention,
  promise,
  unicorn,
  vitest,
  jsDoc,
  mdx,
  prettier,
  {
    name: 'root/import-x-order',
    files: [files.jsTsNoX],
    rules: {
      'import-x/order': [
        'error',
        { alphabetize: { order: 'asc', caseInsensitive: true }, 'newlines-between': 'never' },
      ],
    },
  },
  {
    name: 'root/global-ignores',
    ignores: ['test-package/', 'node_modules/', 'coverage/', 'reports/', '.vscode/', 'dist/', '.temp/'],
  },
);
