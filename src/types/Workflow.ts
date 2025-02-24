import type * as core from '@actions/core';

export type Workflow = Pick<
  typeof core,
  'setOutput' | 'setFailed' | 'getBooleanInput' | 'getInput' | 'getMultilineInput'
>;

export type InputOptions = core.InputOptions;
