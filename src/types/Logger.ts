import type * as core from '@actions/core';

export type Logger = Pick<
  typeof core,
  'group' | 'startGroup' | 'endGroup' | 'debug' | 'error' | 'info' | 'warning' | 'notice' | 'isDebug'
>;
