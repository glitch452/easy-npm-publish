import path from 'node:path';
import semver from 'semver';
import { z } from 'zod';
import { DEFAULT_TYPE_TITLES } from './constants.js';
import { Workflow } from 'src/types/Workflow.js';

export function getInputs(getters: Pick<Workflow, 'getBooleanInput' | 'getInput' | 'getMultilineInput'>) {
  const originals = {
    changelogTitles: getters.getInput('changelog-titles'),
    versionOverride: getters.getInput('version-override'),
    registryUrl: getters.getInput('registry-url') || 'registry.npmjs.org',
  };

  const versionOverride = originals.versionOverride ? semver.parse(originals.versionOverride) : undefined;
  if (originals.versionOverride && !versionOverride) {
    throw new Error(`The version override "${originals.versionOverride}" is not a valid semver string.`);
  }

  const changelogTitles = z.record(z.string(), z.string()).parse(JSON.parse(originals.changelogTitles || '{}'));

  const inputs = {
    changelogTitles: { ...DEFAULT_TYPE_TITLES, ...changelogTitles },
    dryRun: getters.getBooleanInput('dry-run'),
    enableGithubRelease: getters.getBooleanInput('enable-github-release'),
    enableGitTagging: !getters.getBooleanInput('disable-git-tagging'),
    getReleaseTitleFromPr: getters.getBooleanInput('get-release-title-from-pr'),
    githubToken: getters.getInput('github-token'),
    gitTagSuffix: getters.getInput('git-tag-suffix'),
    latestTagName: getters.getInput('latest-tag-name') || 'latest',
    majorTypes: getters.getInput('major-types').split(',').filter(Boolean),
    minorTypes: (getters.getInput('minor-types') || 'feat').split(',').filter(Boolean),
    npmrcContent: getters.getInput('npmrc-content'),
    npmrcPath: getters.getInput('npmrc-path') || path.join(process.env.HOME ?? '', '.npmrc'),
    packageDirectory: getters.getInput('package-directory') || '.',
    prependVersionToReleaseTitle: getters.getBooleanInput('prepend-version-to-release-title'),
    private: getters.getBooleanInput('private'),
    registryToken: getters.getInput('registry-token'),
    releaseTitle: getters.getInput('release-title'),
    registryUrl: new URL(
      originals.registryUrl.startsWith('http') ? originals.registryUrl : `https://${originals.registryUrl}`,
    ),
    scriptsPackageDirectory:
      getters.getInput('scripts-package-directory') || getters.getInput('package-directory') || '.',
    versionOverride,
  } as const;

  if (inputs.enableGitTagging && !inputs.githubToken) {
    throw new Error('The "github-token" input was not provided. It is required when git tagging is enabled.');
  }

  return inputs;
}
