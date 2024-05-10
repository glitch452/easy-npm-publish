export const DEFAULT_TYPE_TITLES = {
  breaking: 'BREAKING CHANGES',
  build: 'Build',
  chore: 'Chores',
  ci: 'Continuous Integration',
  docs: 'Documentation',
  feat: 'Features',
  fix: 'Fixes',
  perf: 'Performance Improvements',
  refactor: 'Refactoring',
  revert: 'Reverted Commits',
  style: 'Code Style and Formatting',
  test: 'Tests',
} as const;

export const CONVENTIONAL_COMMIT_REGEX = /^(?<type>[^(!:]+)(?:\((?<scope>[^)]*)\))?!?:\s*(?<description>.+)$/;
