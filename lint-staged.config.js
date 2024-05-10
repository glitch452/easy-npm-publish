export default {
  '*.{mjs,cjs,js,ts}': ['eslint --cache --report-unused-disable-directives --fix', 'prettier --ignore-unknown --write'],
  '*.{json,md,yaml,yml}': 'prettier --ignore-unknown --write',
};
