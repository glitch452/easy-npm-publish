import path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import semver, { ReleaseType, SemVer } from 'semver';
import { readPackageJson, writeNpmrc, writePackageJson } from './io/fs.js';
import { Git } from './io/git.js';
import { getLatestPackageDetails } from './io/getLatestPackageDetails.js';
import { getInputs } from './core/getInputs.js';
import { createNpmrc } from './core/createNpmrc.js';
import { getIncrementType } from './core/getIncrementType.js';
import { publishPackage } from './io/publishPackage.js';
import { buildChangelog } from './core/buildChangelog.js';

const JSON_INDENT = 2;

export async function run() {
  try {
    /* Initialization */
    const cwd = process.env.GITHUB_WORKSPACE;
    if (!cwd) {
      throw new Error(
        'Unable to retrieve the current working directory using environment variable "GITHUB_WORKSPACE".',
      );
    }
    const inputs = getInputs();
    const git = new Git();
    const octokit = github.getOctokit(inputs.githubToken);
    const packagePath = path.join(cwd, inputs.packageDirectory, 'package.json');
    const scriptsPackagePath = path.join(cwd, inputs.scriptsPackageDirectory, 'package.json');

    /* Setup .npmrc for npm commands */
    core.startGroup('Writing .npmrc file');
    const npmrcContents = inputs.npmrcContent || createNpmrc(inputs);
    core.debug(`Writing .npmrc file at "${inputs.npmrcPath}":\n${npmrcContents}`);
    writeNpmrc(inputs.npmrcPath, npmrcContents);
    core.endGroup();

    /* Get the package.json for the package to publish */
    core.info(`Reading package file at "${packagePath}"`);
    const packageJson = readPackageJson(packagePath);
    core.debug(`Package file contents:\n${JSON.stringify(packageJson)}`);

    /* Get the package details for the latest version in the registry */
    core.info(`Reading latest package details from registry "${inputs.registryUrl}" for package "${packageJson.name}"`);
    const latestPackageDetails = await getLatestPackageDetails(
      inputs.registryUrl,
      packageJson.name,
      inputs.registryToken,
    );
    core.debug(`Registry manifest contents:\n${JSON.stringify(latestPackageDetails)}`);

    /* Get the version details */
    const packageJsonVersion = semver.parse(packageJson.version);
    let gitHistoryRange: Parameters<typeof git.getHistory>[0];
    let currentVersion: SemVer | null;
    let nextVersion: SemVer | null;
    let incrementType: ReleaseType | null;

    if (latestPackageDetails) {
      if (latestPackageDetails.gitHead === github.context.sha) {
        core.info('GitHub SHA matches latest release SHA, exiting.');
        return;
      }

      currentVersion = semver.parse(latestPackageDetails.version);
      if (!currentVersion) {
        throw new Error(
          `The current version in the registry "${latestPackageDetails.version}" is not a valid semver value.`,
        );
      }

      const currentTag = `v${currentVersion}${inputs.gitTagSuffix}`;
      gitHistoryRange = { fromTag: currentTag, fromSha: latestPackageDetails.gitHead, toSha: github.context.sha };
    } else if (packageJsonVersion) {
      currentVersion = packageJsonVersion;
      core.warning(
        `The package was not found in the registry. The version from the package json "${packageJsonVersion}" will be used as the current version.`,
      );
    } else {
      currentVersion = semver.parse('v0.0.0');
      if (!currentVersion) {
        throw new Error('Unexpected error parsing "v0.0.0" with the semver package.');
      }
      core.warning(
        `The package was not found in the registry. The version "v0.0.0" will be used as the current version.`,
      );
    }

    const gitHistory = await git.getHistory(gitHistoryRange);

    if (inputs.versionOverride) {
      incrementType = semver.diff(currentVersion, inputs.versionOverride);
      nextVersion = inputs.versionOverride;
    } else {
      core.debug(
        `Using git history to determine increment type:\n${JSON.stringify(gitHistory, undefined, JSON_INDENT)}`,
      );
      incrementType = getIncrementType(gitHistory, inputs.majorTypes, inputs.minorTypes);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- semver.parse with semver object as input returns the same object
      nextVersion = semver.parse(currentVersion.version)!.inc(incrementType);
    }

    core.info(`Current package version: ${currentVersion}`);
    core.info(`Next package version: ${nextVersion}`);
    core.info(`Increment Type: ${incrementType ?? ''}`);

    /* Update the version in the package.json for the package being published */
    if (packageJson.version !== nextVersion.version) {
      packageJson.version = nextVersion.version;
      if (inputs.dryRun) {
        core.info(`DRY RUN: Updating package json with next version: "${packagePath}"`);
      } else {
        core.debug(`Updating package json with next version: "${packagePath}"`);
        writePackageJson(packagePath, packageJson);
      }
    }

    /* Publish the package to the registry */
    await publishPackage(scriptsPackagePath, packagePath, packageJson, inputs.private, inputs.dryRun);

    /* Cleanup the changes made to the git workspace */
    if (!inputs.dryRun) {
      await git.restore();
    }

    const newTag = `v${nextVersion.version}${inputs.gitTagSuffix}`;

    /* Apply the git tags */
    if (inputs.enableGitTagging) {
      const newTagMinor = `v${nextVersion.major}.${nextVersion.minor}${inputs.gitTagSuffix}`;
      const newTagMajor = `v${nextVersion.major}${inputs.gitTagSuffix}`;
      const tags = [inputs.latestTagName, newTag, newTagMinor, newTagMajor];
      if (inputs.dryRun) {
        core.info(`DRY RUN: Git tags to be added/updated: ${JSON.stringify(tags)}`);
      } else {
        core.debug(`Git tags to be added/updated: ${JSON.stringify(tags)}`);
        await git.addTags(tags);
        await git.pushTags();
      }
    }

    /* Create release notes and GitHub Release */
    core.info('Creating GitHub Release');

    const getReleaseTitle = async (): Promise<string> => {
      if (inputs.releaseTitle) {
        return inputs.releaseTitle;
      }
      if (inputs.getReleaseTitleFromPr) {
        const response = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
          ...github.context.repo,
          commit_sha: github.context.sha,
        });
        return response.data[0]?.title || newTag;
      }
      return newTag;
    };

    const releaseDetails = {
      ...github.context.repo,
      tag_name: newTag,
      name: await getReleaseTitle(),
      body: buildChangelog(gitHistory, github.context.repo, inputs.changelogTitles, inputs.majorTypes),
      prerelease: false,
      draft: false,
    };

    core.debug(`GitHub Release Details: ${JSON.stringify(releaseDetails)}`);
    await octokit.rest.repos.createRelease(releaseDetails);

    /* Set the action outputs */
    core.setOutput('current-version', currentVersion.version);
    core.setOutput('increment-type', incrementType ?? '');
    core.setOutput('next-version', nextVersion.version);
    core.setOutput('next-version-major', nextVersion.major);
    core.setOutput('next-version-minor', nextVersion.minor);
    core.setOutput('next-version-patch', nextVersion.patch);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    core.setFailed(message);
  }
}
