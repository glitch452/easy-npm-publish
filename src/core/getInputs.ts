import * as core from '@actions/core';
import path from 'path';
import semver from 'semver';
import { z } from 'zod';
import { DEFAULT_TYPE_TITLES } from './constants.js';

export type Getters = Pick<typeof core, 'getBooleanInput' | 'getInput' | 'getMultilineInput'>;
export type InputOptions = core.InputOptions;

export function getInputs(getters: Getters = core) {
  const originals = {
    changelogTitles: getters.getInput('changelog-titles'),
    versionOverride: getters.getInput('version-override'),
    registryUrl: getters.getInput('registry-url') || 'registry.npmjs.org',
  };

  const versionOverride = originals.versionOverride ? semver.parse(originals.versionOverride) : null;
  if (originals.versionOverride && !versionOverride) {
    throw new Error(`The version override "${originals.versionOverride}" is not a valid semver string.`);
  }

  const changelogTitles = z.record(z.string()).parse(JSON.parse(originals.changelogTitles || '{}'));

  const inputs = {
    changelogTitles: { ...DEFAULT_TYPE_TITLES, ...changelogTitles },
    dryRun: getters.getBooleanInput('dry-run'),
    enableGitTagging: !getters.getBooleanInput('disable-git-tagging'),
    enableGithubRelease: getters.getBooleanInput('enable-github-release'),
    getReleaseTitleFromPr: getters.getBooleanInput('get-release-title-from-pr'),
    githubToken: getters.getInput('github-token'),
    gitTagSuffix: getters.getInput('git-tag-suffix'),
    latestTagName: getters.getInput('latest-tag-name') || 'latest',
    majorTypes: getters.getInput('major-types').split(',').filter(Boolean),
    minorTypes: (getters.getInput('minor-types') || 'feat').split(',').filter(Boolean),
    npmrcContent: getters.getInput('npmrc-content'),
    npmrcPath: getters.getInput('npmrc-path') || path.join(process.env.HOME ?? '', '.npmrc'),
    packageDirectory: getters.getInput('package-directory') || '.',
    private: getters.getBooleanInput('private'),
    registryToken: getters.getInput('registry-token', { required: true }),
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
