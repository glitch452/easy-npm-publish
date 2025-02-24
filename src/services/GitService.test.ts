import { getGitMock } from '__mocks__/getGitMock.js';
import { GitService } from './GitService.js';
import { getLoggerMock } from '__mocks__/getLoggerMock.js';

describe(GitService.name, () => {
  const gitMock = getGitMock();
  const loggerMock = getLoggerMock();
  const gitService = new GitService(loggerMock, gitMock);

  beforeEach(() => {
    gitMock.revparse.mockResolvedValue('true\n');
    gitMock.log.mockResolvedValue({ all: [] });
    gitMock.tags.mockResolvedValue({ all: [] });
    gitMock.raw.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe(GitService.prototype.addTags.name, () => {
    it('should call the underlying tag method once for each tag provided', async () => {
      const tags = ['<tag1>', '<tag2>', '<tag3>', '<tag4>'];
      await gitService.addTags(tags);
      expect(gitMock.tag).toHaveBeenCalledTimes(tags.length);
    });

    it('should call the underlying tag method with the "--force" option for the first tag provided', async () => {
      const tags = ['<tag1>', '<tag2>'];
      await gitService.addTags(tags);
      expect(gitMock.tag).toHaveBeenCalledWith(['<tag1>', '--force']);
    });

    it('should call the underlying tag method with the "--force" option for the second tag provided', async () => {
      const tags = ['<tag1>', '<tag2>'];
      await gitService.addTags(tags);
      expect(gitMock.tag).toHaveBeenCalledWith(['<tag2>', '--force']);
    });
  });

  describe(GitService.prototype.pushTags.name, () => {
    it('should call the underlying pushTags method with the "--force" flag', async () => {
      await gitService.pushTags();
      expect(gitMock.pushTags).toHaveBeenCalledExactlyOnceWith(['--force']);
    });
  });

  describe(GitService.prototype.restore.name, () => {
    it('should call the underlying raw method with the restore argument and a "." to include all files by default', async () => {
      await gitService.restore();
      expect(gitMock.raw).toHaveBeenCalledExactlyOnceWith(['restore', '.']);
    });

    it('should call the underlying raw method with the restore argument and the provided list of files', async () => {
      const files = ['<file1>', '<file2>'];
      await gitService.restore(files);
      expect(gitMock.raw).toHaveBeenCalledExactlyOnceWith(['restore', ...files]);
    });
  });

  describe(GitService.prototype.getHistory.name, () => {
    it('should check if the repo is a shallow clone by calling revparse with the "--is-shallow-repository" flag', async () => {
      await gitService.getHistory();
      expect(gitMock.revparse).toHaveBeenCalledExactlyOnceWith(['--is-shallow-repository']);
    });

    describe('No range provided', () => {
      it('should not call fetch if the repo is not shallow', async () => {
        gitMock.revparse.mockResolvedValue('false\n');
        await gitService.getHistory();
        expect(gitMock.fetch).not.toHaveBeenCalled();
      });

      it('should call fetch with the "--unshallow" flag if the repo is shallow', async () => {
        await gitService.getHistory();
        expect(gitMock.fetch).toHaveBeenCalledExactlyOnceWith(['--unshallow']);
      });
    });
  });

  describe('With a range provided', () => {
    const history = [
      {
        hash: 'hash1',
        date: 'date1',
        message: 'message1',
        refs: 'refs1',
        body: 'body1',
        author_name: 'author_name1',
        author_email: 'author_email1',
      },
      {
        hash: 'hash2',
        date: 'date2',
        message: 'message2',
        refs: 'refs2',
        body: 'body2',
        author_name: 'author_name2',
        author_email: 'author_email2',
      },
    ];

    it('should call fetch with the "--unshallow" flag if the repo is shallow and the fromTag and latest tags are not found', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      await gitService.getHistory(range);
      expect(gitMock.fetch).toHaveBeenCalledWith(['--unshallow']);
    });

    it('should return the history when the fromTag is found', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: [range.fromTag] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? range.fromSha : ''));
      gitMock.log.mockResolvedValue({ all: history });
      const actual = await gitService.getHistory(range);
      expect(actual).toStrictEqual(history);
    });

    it('should return the history when the fromTag is not found but the latest tag is found', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'latestSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: ['latest'] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? 'latestSha' : ''));
      gitMock.log.mockResolvedValue({ all: history });
      const actual = await gitService.getHistory(range);
      expect(actual).toStrictEqual(history);
    });

    it('should throw when the fromTag is not found but the latest tag is found but the fromSha does not match the tag', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: ['latest'] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? 'latestSha' : ''));
      gitMock.log.mockResolvedValue({ all: history });
      const actual = gitService.getHistory(range);
      await expect(actual).rejects.toThrow('From SHA does not match the SHA for tag');
    });

    it('should throw when the fromTag is found but the fromSha does not match the tag', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: ['latest'] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? 'otherSha' : ''));
      gitMock.log.mockResolvedValue({ all: history });
      const actual = gitService.getHistory(range);
      await expect(actual).rejects.toThrow('From SHA does not match the SHA for tag');
    });

    it('should return an empty history list the fromTag matches the toSha', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'toSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: [range.fromTag] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? range.fromSha : ''));
      const actual = await gitService.getHistory(range);
      expect(actual).toStrictEqual([]);
    });

    it('should call fetch with "--shallow-exclude" before "--deepen" when the repo is shallow', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      gitMock.tags.mockResolvedValue({ all: [range.fromTag] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? range.fromSha : ''));
      await gitService.getHistory(range);
      const actual = gitMock.fetch.mock.calls.map(([arg1]) => arg1);
      const expected = [['--tags'], ['--shallow-exclude', range.fromTag], ['--deepen', '1']];
      expect(actual).toStrictEqual(expected);
    });

    it('should not throw when the repo is not shallow and the fromSha does not match the tagSha', async () => {
      const range = { fromTag: 'fromTag', fromSha: 'fromSha', toSha: 'toSha' };
      gitMock.revparse.mockResolvedValue('false\n');
      gitMock.tags.mockResolvedValue({ all: [range.fromTag] });
      gitMock.raw.mockImplementation((args) => (args[0] === 'rev-list' ? 'tagSha' : ''));
      const actual = gitService.getHistory(range);
      await expect(actual).resolves.toBeDefined();
    });
  });
});
