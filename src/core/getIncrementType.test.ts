import { getIncrementType } from './getIncrementType.js';
import { GitLogEntry } from './git-log-tools.js';

const hash = 'a10d25492f1c3a33f05947cc5445f5a159436b7a';

describe(getIncrementType.name, () => {
  const docs: GitLogEntry = { message: 'docs: updated readme', body: '', hash };
  const fix: GitLogEntry = { message: 'fix: updated readme', body: '', hash };
  const feat: GitLogEntry = { message: 'feat: added something new', body: '', hash };

  it('should return a "major" change when a commit body contains "BREAKING CHANGE" and a commit contains a minor type', () => {
    const actual = getIncrementType([docs, fix, feat, { ...feat, body: 'BREAKING CHANGE: Thing' }], [], ['feat']);
    expect(actual).toStrictEqual('major');
  });

  it('should return a "major" change when a commit body contains "BREAKING-CHANGE" and a commit contains a minor type', () => {
    const actual = getIncrementType([docs, fix, feat, { ...feat, body: 'BREAKING-CHANGE: Thing' }], [], ['feat']);
    expect(actual).toStrictEqual('major');
  });

  it('should return a "major" change when a commit message has a major type and a commit contains a minor type', () => {
    const actual = getIncrementType(
      [docs, fix, feat, { message: 'major: Thing', body: '', hash }],
      ['major'],
      ['feat'],
    );
    expect(actual).toStrictEqual('major');
  });

  it('should return a "major" change when a commit message has a "!:" and a commit contains a minor type', () => {
    const actual = getIncrementType([docs, fix, feat, { message: 'major!: Thing', body: '', hash }], [], ['feat']);
    expect(actual).toStrictEqual('major');
  });

  it('should return a "patch" change when none of the commit messages contain a major or minor type', () => {
    const actual = getIncrementType([docs, fix], ['major'], ['feat']);
    expect(actual).toStrictEqual('patch');
  });

  it('should return a "minor" change when one of the commit messages contains minor type', () => {
    const actual = getIncrementType([docs, fix, feat], ['major'], ['feat']);
    expect(actual).toStrictEqual('minor');
  });
});
