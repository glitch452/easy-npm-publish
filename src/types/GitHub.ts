import type * as github from '@actions/github';

export interface GitHub {
  getOctokit: (typeof github)['getOctokit'];
  context: Pick<(typeof github)['context'], 'sha' | 'repo'>;
}
