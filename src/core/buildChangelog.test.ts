import { buildChangelog } from './buildChangelog.js';
import { CONVENTIONAL_COMMIT_REGEX, DEFAULT_TYPE_TITLES } from './constants.js';
import { GitLogEntry } from './git-log-tools.js';

interface RegexTest {
  input: string;
  type: string;
  scope?: string;
  description: string;
}

const hash = 'a10d25492f1c3a33f05947cc5445f5a159436b7a';
const repoMeta = { repo: 'repo', owner: 'owner' };
const hashLink = '([a10d254](https://github.com/owner/repo/commit/a10d25492f1c3a33f05947cc5445f5a159436b7a))';

describe(buildChangelog.name, () => {
  describe('CONVENTIONAL_COMMIT_REGEX', () => {
    const invalidInputs = [
      'type(: no close scope',
      'type(scope: no close scope',
      'no conventional commit',
      'feat missing colon',
      'feat! missing colon',
      'feat()! missing colon',
      ': start with colon',
    ];

    it.each(invalidInputs)('should fail with invalid input "%s"', (input) => {
      const actual = CONVENTIONAL_COMMIT_REGEX.test(input);
      expect(actual).toBe(false);
    });

    const regexTests: RegexTest[] = [
      { input: 'type: description', type: 'type', scope: undefined, description: 'description' },
      { input: 'type(): description', type: 'type', scope: '', description: 'description' },
      { input: 'type(scope): description', type: 'type', scope: 'scope', description: 'description' },
      { input: 'type!: description', type: 'type', scope: undefined, description: 'description' },
      { input: 'type()!: description', type: 'type', scope: '', description: 'description' },
      { input: 'type(scope)!: description', type: 'type', scope: 'scope', description: 'description' },
      { input: 'type!:    description', type: 'type', scope: undefined, description: 'description' },
      { input: 'type()!:    description', type: 'type', scope: '', description: 'description' },
      { input: 'type(scope)!:    description', type: 'type', scope: 'scope', description: 'description' },
      { input: 'type(scope:test): description', type: 'type', scope: 'scope:test', description: 'description' },
    ];

    it.each(regexTests)('should extract the type, scope and description from $input', ({ input, ...expected }) => {
      const actual = CONVENTIONAL_COMMIT_REGEX.exec(input)?.groups;
      expect(actual).toStrictEqual(expect.objectContaining(expected));
    });
  });

  describe(buildChangelog.name, () => {
    it('should return an empty string when the git history has no items', () => {
      const actual = buildChangelog([], repoMeta, {});
      const expected = ``;
      expect(actual).toStrictEqual(expected);
    });

    it('should convert the type into a title when the type is in the titles map', () => {
      const gitHistory: GitLogEntry[] = [{ message: 'feat: Change #1', body: '', hash }];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should use the type as the title when the type is not in the titles map', () => {
      const gitHistory: GitLogEntry[] = [{ message: 'not-a-type: Change #1', body: '', hash }];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# not-a-type\n- Change #1 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should use the given title override', () => {
      const gitHistory: GitLogEntry[] = [{ message: 'feat!: Change #1', body: '', hash }];
      const actual = buildChangelog(gitHistory, repoMeta, { breaking: 'Brk' });
      const expected = `# Brk\n- Change #1 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should use the fallback title for the breaking type if its not provided in the title map', () => {
      const gitHistory: GitLogEntry[] = [{ message: 'feat!: Change #1', body: '', hash }];
      const actual = buildChangelog(gitHistory, repoMeta, {});
      const expected = `# BREAKING CHANGES\n- Change #1 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should return the features section when only features are provided', () => {
      const gitHistory: GitLogEntry[] = [
        { message: 'feat: Change #1', body: '', hash },
        { message: 'feat: Change #2', body: '', hash },
      ];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n- Change #2 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should return the features and fixes sections when features and fixes are provided', () => {
      const gitHistory: GitLogEntry[] = [
        { message: 'feat: Change #1', body: '', hash },
        { message: 'feat: Change #2', body: '', hash },
        { message: 'fix: Change #1', body: '', hash },
        { message: 'fix: Change #2', body: '', hash },
      ];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n- Change #2 ${hashLink}\n\n# ${DEFAULT_TYPE_TITLES.fix}\n- Change #1 ${hashLink}\n- Change #2 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should put the change into the breaking changes section when it is a breaking change', () => {
      const gitHistory: GitLogEntry[] = [
        { message: 'feat: Change #1', body: '', hash },
        { message: 'feat!: Change #2', body: '', hash },
        { message: 'feat: Change #3', body: '', hash },
      ];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.breaking}\n- Change #2 ${hashLink}\n\n# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n- Change #3 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should not include entries that do not follow the conventional commit format', () => {
      const gitHistory: GitLogEntry[] = [
        { message: 'feat: Change #1', body: '', hash },
        { message: 'feat: Change #2', body: '', hash },
        { message: 'random message', body: '', hash },
      ];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n- Change #2 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });

    it('should include the scope if one is provided', () => {
      const gitHistory: GitLogEntry[] = [
        { message: 'feat: Change #1', body: '', hash },
        { message: 'feat(scope): Change #2', body: '', hash },
        { message: 'random message', body: '', hash },
      ];
      const actual = buildChangelog(gitHistory, repoMeta);
      const expected = `# ${DEFAULT_TYPE_TITLES.feat}\n- Change #1 ${hashLink}\n- scope: Change #2 ${hashLink}\n`;
      expect(actual).toStrictEqual(expected);
    });
  });
});
