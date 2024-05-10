import eslint from '@eslint/js';
import typescriptEsLint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import jsDocPlugin from 'eslint-plugin-jsdoc';
import eslintConfigPrettier from 'eslint-config-prettier';
import vitestPlugin from 'eslint-plugin-vitest';
import globals from 'globals';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- No types for module
// @ts-expect-error
import importPlugin from 'eslint-plugin-import';

/** @param {string=} baseDirectory */
const flatCompat = (baseDirectory) => new FlatCompat({ baseDirectory, recommendedConfig: eslint.configs.recommended });

/** @satisfies {Record<string, string[]>} */
const files = {
  cjs: ['**/*.cjs?(x)'],
  js: ['**/*.?(c|m)js?(x)'],
  ts: ['**/*.?(c|m)ts?(x)'],
  jsTs: ['**/*.?(c|m)[jt]s?(x)'],
  markdown: ['**/*.md?(x)'],
  testSpec: ['**/?(*.)@(spec|test).?(c|m)[jt]s?(x)'],
};

const config = /** @type {import('eslint').Linter.FlatConfig[]} */ (
  typescriptEsLint.config(
    { ...eslint.configs.recommended, files: files.jsTs },
    ...typescriptEsLint.configs.recommended.map((c) => ({ ...c, files: files.jsTs })),
    ...flatCompat().plugins('unused-imports', 'disable-autofix', 'typescript-enum'),
    {
      files: files.jsTs,
      plugins: { import: importPlugin },
      settings: {
        'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
      },
      rules: {
        /*!* unused-imports Rules *!*/
        // Use the rule from unused-imports instead of eslint or typescript-eslint
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-vars': [
          'error',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'unused-imports/no-unused-imports': 'error',

        /*!* import Rules *!*/
        ...importPlugin.configs.recommended.rules,
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-absolute-path': 'error',
        'import/no-duplicates': ['error', { considerQueryString: true }],
        'import/no-empty-named-blocks': 'error',
        'import/no-import-module-exports': 'error',
        'import/no-self-import': 'error',
        'import/no-useless-path-segments': 'error',
        // TODO: Enable when issue is resolved: https://github.com/import-js/eslint-plugin-import/issues/2556
        'import/namespace': 'off',
        // Let Typescript handle unresolved modules
        'import/no-unresolved': 'off',
        // Disable built-in rule in favour of import plugin rule
        'no-duplicate-imports': 'off',

        /*!* typescript-enum Rules *!*/
        'typescript-enum/no-enum': 'error',
        'typescript-enum/no-const-enum': 'error',

        /*!* JS Rules *!*/
        'array-callback-return': 'error',
        'default-case': 'off',
        'default-case-last': 'error',
        'dot-notation': 'error',
        'no-alert': 'error',
        'no-caller': 'error',
        'no-constructor-return': 'error',
        'no-delete-var': 'error',
        'no-else-return': ['error', { allowElseIf: false }],
        'no-eq-null': 'error',
        'no-eval': 'error',
        'no-extra-bind': 'error',
        'no-floating-decimal': 'error',
        'no-implied-eval': 'error',
        'no-iterator': 'error',
        'no-labels': 'error',
        'no-new-func': 'error',
        'no-param-reassign': 'error',
        'no-proto': 'error',
        'no-return-assign': 'error',
        'no-script-url': 'error',
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-undef': 'off',
        'no-unmodified-loop-condition': 'error',
        'no-useless-call': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-concat': 'error',
        'no-useless-rename': 'error',
        'no-useless-return': 'error',
        'no-var': 'error',
        'object-shorthand': ['error', 'always'],
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'require-atomic-updates': 'error',
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        curly: 'error',
        eqeqeq: 'error',
        yoda: ['error', 'never', { exceptRange: true }],

        // Disable JS rules that have TS versions below
        'default-param-last': 'off',
        'lines-between-class-members': 'off',
        'no-dupe-class-members': 'off',
        'no-loop-func': 'off',
        'no-magic-numbers': 'off',
        'no-shadow': 'off',

        /*!* Typescript Plugin Rules that DO NOT require type-checking *!*/
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/consistent-indexed-object-style': 'error',
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/default-param-last': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        '@typescript-eslint/member-delimiter-style': 'error',
        '@typescript-eslint/member-ordering': ['error', { interfaces: 'never', typeLiterals: 'never' }],
        '@typescript-eslint/method-signature-style': ['error', 'property'],
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',
        '@typescript-eslint/no-dupe-class-members': 'error',
        '@typescript-eslint/no-dynamic-delete': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-extra-non-null-assertion': 'error',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-inferrable-types': ['error', { ignoreParameters: true }],
        '@typescript-eslint/no-invalid-void-type': ['error', { allowAsThisParameter: true }],
        '@typescript-eslint/no-loop-func': 'error',
        '@typescript-eslint/no-magic-numbers': [
          'error',
          {
            ignoreEnums: true,
            ignoreNumericLiteralTypes: false,
            ignoreReadonlyClassProperties: true,
            ignore: [-1, 0, 1],
          },
        ],
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-unsafe-declaration-merging': 'error',
        '@typescript-eslint/no-useless-constructor': 'error',
        '@typescript-eslint/no-useless-empty-export': 'error',
        '@typescript-eslint/parameter-properties': 'off',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        '@typescript-eslint/sort-type-constituents': 'error',
      },
    },
    // Type Enabled Rules
    {
      files: files.jsTs,
      languageOptions: { parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname } },
      rules: {
        // Disable JS rules that have TS versions below
        'dot-notation': 'off',
        'no-throw-literal': 'off',
        'no-unused-expressions': 'off',

        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-confusing-void-expression': 'error',
        '@typescript-eslint/no-duplicate-type-constituents': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-meaningless-void-operator': 'error',
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
        '@typescript-eslint/no-mixed-enums': 'error',
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/no-unsafe-enum-comparison': 'error',
        '@typescript-eslint/no-unused-expressions': 'error',
        '@typescript-eslint/only-throw-error': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/prefer-readonly': 'error',
        '@typescript-eslint/prefer-reduce-type-parameter': 'error',
        '@typescript-eslint/prefer-string-starts-ends-with': 'error',
        '@typescript-eslint/promise-function-async': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      },
    },
    // Vitest
    {
      files: files.testSpec,
      plugins: { vitest: vitestPlugin },
      settings: { vitest: { typecheck: true } },
      languageOptions: { globals: vitestPlugin.environments.env.globals },
      rules: {
        ...vitestPlugin.configs.recommended.rules,
        'vitest/consistent-test-it': ['error', { fn: 'test', withinDescribe: 'it' }],
        'vitest/valid-title': ['error', { ignoreTypeOfDescribeName: true }],
        'vitest/no-disabled-tests': 'error',
        'vitest/no-duplicate-hooks': 'error',
        'vitest/no-focused-tests': 'error',
        'vitest/prefer-expect-resolves': 'error',
        'vitest/valid-expect': 'error',
        'vitest/no-commented-out-tests': 'warn',
        'vitest/prefer-to-have-length': 'warn',
        'vitest/prefer-strict-equal': 'warn',
        // Quality of Life adjustments
        '@typescript-eslint/no-magic-numbers': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
      },
    },
    // Common JS Files
    {
      files: files.cjs,
      languageOptions: { sourceType: 'commonjs', globals: globals.node },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    // JSDoc
    {
      files: files.ts,
      plugins: { jsdoc: jsDocPlugin },
      rules: jsDocPlugin.configs['flat/recommended-typescript-error'].rules,
    },
    {
      files: files.js,
      plugins: { jsdoc: jsDocPlugin },
      rules: jsDocPlugin.configs['flat/recommended-typescript-flavor-error'].rules,
    },
    {
      files: files.jsTs,
      plugins: { jsdoc: jsDocPlugin },
      rules: {
        'jsdoc/no-bad-blocks': 'error',
        'jsdoc/no-blank-block-descriptions': 'error',
        'jsdoc/no-blank-blocks': 'error',
        'jsdoc/require-jsdoc': 'off',
        'jsdoc/require-param-description': 'off',
        'jsdoc/require-returns-description': 'off',
        'jsdoc/require-returns': 'off',
        'jsdoc/require-throws': 'error',
        'jsdoc/require-asterisk-prefix': 'error',
      },
    },
    eslintConfigPrettier,
    {
      ignores: [
        '**/test-package/**/*',
        '**/node_modules/**/*',
        '**/coverage/**/*',
        '**/reports/**/*',
        '**/.vscode/**/*',
        '**/dist/**/*',
      ],
    },
  )
);

export default config;
