import { DefaultLogFields, ListLogLine, SimpleGit, simpleGit } from 'simple-git';
import { Logger } from 'src/types/Logger.js';

export type Git = Pick<SimpleGit, 'tag' | 'pushTags' | 'raw' | 'revparse' | 'fetch' | 'tags' | 'log'>;

export type GitHistoryEntry = DefaultLogFields & ListLogLine;

export class GitService {
  constructor(
    private readonly logger: Logger,
    private readonly git: Git = simpleGit(),
  ) {}

  async addTags(tags: string[]) {
    await Promise.all(tags.map(async (tag) => this.git.tag([tag, '--force'])));
  }

  async pushTags() {
    return this.git.pushTags(['--force']);
  }

  async restore(files: string[] = ['.']) {
    return this.git.raw(['restore', ...files]);
  }

  async getHistory(range?: { fromTag: string; fromSha: string; toSha: string }): Promise<readonly GitHistoryEntry[]> {
    const isShallow = (await this.git.revparse(['--is-shallow-repository'])).trim() === 'true';

    if (range) {
      await this.git.fetch(['--tags']);
      const tags = await this.git.tags();

      const tag = tags.all.includes(range.fromTag) ? range.fromTag : tags.all.find((x) => x === 'latest');

      if (tag) {
        if (tag === 'latest') {
          this.logger.info(`Tag "${range.fromTag}" was not found, attempting to use the "latest" tag.`);
        }

        if (isShallow) {
          const tagSha = (await this.git.raw(['rev-list', '-n', '1', tag])).trim();
          if (range.fromSha !== tagSha) {
            // The tag sha should match the from sha so that the unshallow will include all the necessary commits
            throw new Error(`From SHA does not match the SHA for tag "${tag}"`);
          }

          await this.git.fetch(['--shallow-exclude', tag]);
          // Deepen one more to include the commit of the tag itself to be able to use it below as the `from` sha
          await this.git.fetch(['--deepen', '1']);
        }

        this.logger.debug(`Git History Range Details: ${JSON.stringify({ tagUsed: tag, ...range })}`);

        if (range.fromSha === range.toSha) {
          return [];
        }

        return (await this.git.log({ from: range.fromSha, to: range.toSha })).all;
      }

      this.logger.info(`Tags "${range.fromTag}" and "latest" were not found, attempting to load the full git history.`);
      this.logger.warning(
        `Retrieving the full history may cause performance issues for large repositories. Enable git tagging to prevent this.`,
      );
    }

    if (isShallow) {
      await this.git.fetch(['--unshallow']);
    }
    return (await this.git.log()).all;
  }
}
