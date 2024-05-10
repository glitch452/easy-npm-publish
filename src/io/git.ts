import * as core from '@actions/core';
import { DefaultLogFields, ListLogLine, SimpleGit, simpleGit } from 'simple-git';

export class Git {
  constructor(private readonly git: SimpleGit = simpleGit()) {}

  async addTags(tags: string[]) {
    return Promise.all(tags.map(async (tag) => this.git.tag([tag, '--force'])));
  }

  async pushTags() {
    return this.git.pushTags(['--force']);
  }

  async restore(files: string[] = ['.']) {
    return this.git.raw(['restore', ...files]);
  }

  async getHistory(range?: {
    fromTag: string;
    fromSha: string;
    toSha: string;
  }): Promise<readonly (DefaultLogFields & ListLogLine)[]> {
    const isShallow = (await this.git.revparse(['--is-shallow-repository'])).trim() === 'true';

    if (range) {
      await this.git.fetch(['--tags']);
      const tags = await this.git.tags();

      const tag = tags.all.includes(range.fromTag) ? range.fromTag : tags.all.find((x) => x === 'latest');

      if (tag) {
        if (tag === 'latest') {
          core.info(`Tag "${range.fromTag}" was not found, attempting to use the "latest" tag.`);
        }

        if (isShallow) {
          await this.git.fetch(['--shallow-exclude', tag]);
          // Deepen one more to include the commit of the tag itself to be able to use it below as the `from` sha
          await this.git.fetch(['--deepen', '1']);
        }

        const actualTagSha = (await this.git.raw(['rev-list', '-n', '1', tag])).trim();
        if (range.fromSha !== actualTagSha) {
          throw new Error(`Latest release SHA does not match the SHA for tag "${tag}"`);
        }

        core.debug(`Git History Range Details: ${JSON.stringify({ tagUsed: tag, ...range })}`);

        if (range.fromSha === range.toSha) {
          return [];
        }

        return (await this.git.log({ from: range.fromSha, to: range.toSha })).all;
      }

      core.info(`Tags "${range.fromTag}" and "latest" were not found, attempting to load the full git history.`);
      core.warning(
        `Retrieving the full history may cause performance issues for large repositories. Enable git tagging to prevent this.`,
      );
    }

    if (isShallow) {
      await this.git.fetch(['--unshallow']);
    }
    return (await this.git.log()).all;
  }
}
