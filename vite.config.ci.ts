import { InlineConfig } from 'vitest';
import { defineConfig } from 'vitest/config';
import baseConfig from './vite.config.js';

const baseVitestConfig = baseConfig.test;
const baseCoverage: Omit<InlineConfig['coverage'], 'reporter'> | undefined = baseVitestConfig?.coverage;

const configForCi = defineConfig({
  test: {
    ...baseVitestConfig,
    coverage: {
      ...baseCoverage,
      reporter: ['text', 'json', 'json-summary'],
      reportOnFailure: true,
    },
    reporters: [
      'default',
      'github-actions',
      [
        'junit',
        {
          outputFile: 'reports/vitest-junit-report.xml',
          ancestorSeparator: ' > ',
          uniqueOutputName: 'false',
          reportTestSuiteErrors: 'true',
          suiteNameTemplate: '{filepath}',
          classNameTemplate: '{classname}',
          titleTemplate: '{title}',
        },
      ],
    ],
  },
});

export default configForCi;
