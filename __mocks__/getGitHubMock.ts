/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { GitHub } from 'src/types/GitHub.js';

export function getGitHubMock() {
  const listPullRequestsAssociatedWithCommitSpy = vi.fn();
  const createReleaseSpy = vi.fn();
  const getOctokitSpy = vi.fn((_token: string) => {
    return {
      rest: {
        repos: {
          listPullRequestsAssociatedWithCommit: listPullRequestsAssociatedWithCommitSpy,
          createRelease: createReleaseSpy,
        },
      },
    } as any;
  });

  const gitHubMock = {
    context: {
      sha: '<sha>',
      repo: { owner: '<owner>', repo: '<repo>' },
    },
    getOctokit: getOctokitSpy,
  } satisfies GitHub;

  return {
    gitHubMock,
    getOctokitSpy,
    listPullRequestsAssociatedWithCommitSpy,
    createReleaseSpy,
  };
}
