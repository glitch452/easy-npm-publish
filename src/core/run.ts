import path from 'node:path';
import semver, { ReleaseType, SemVer } from 'semver';
import { GitService } from '../services/GitService.js';
import { Files } from '../types/Files.js';
import { GitHub } from '../types/GitHub.js';
import { Logger } from '../types/Logger.js';
import { PackageRegistry } from '../types/PackageRegistry.js';
import { Workflow } from '../types/Workflow.js';
import { buildChangelog } from './buildChangelog.js';
import { getIncrementType } from './getIncrementType.js';
import { getInputs } from './getInputs.js';

const JSON_INDENT = 2;

export async function run(
  logger: Logger,
  workflow: Workflow,
  github: GitHub,
  git: GitService,
  files: Files,
  registry: PackageRegistry,
) {
  try {
    /* Initialization */
    const cwd = process.env.GITHUB_WORKSPACE;
    if (!cwd) {
      throw new Error(
        'Unable to retrieve the current working directory using environment variable "GITHUB_WORKSPACE".',
      );
    }
    const inputs = getInputs(workflow);
    const octokit = github.getOctokit(inputs.githubToken);
    const packagePath = path.join(cwd, inputs.packageDirectory, 'package.json');
    const scriptsPackagePath = path.join(cwd, inputs.scriptsPackageDirectory, 'package.json');

    /* Setup .npmrc for npm commands */
    logger.startGroup('Writing .npmrc file');
    const npmrcContents = inputs.npmrcContent || files.createNpmrc(inputs);
    logger.debug(`Writing .npmrc file at "${inputs.npmrcPath}":\n${npmrcContents}`);
    files.writeNpmrc(inputs.npmrcPath, npmrcContents);
    logger.endGroup();

    /* Get the package.json for the package to publish */
    logger.info(`Reading package file at "${packagePath}"`);
    const packageJson = files.readPackageJson(packagePath);
    logger.debug(`Package file contents:\n${JSON.stringify(packageJson)}`);

    /* Get the package details for the latest version in the registry */
    logger.info(
      `Reading latest package details from registry "${inputs.registryUrl.toString()}" for package "${packageJson.name}"`,
    );
    const latestPackageDetails = await registry.getLatestPackageDetails(
      inputs.registryUrl,
      packageJson.name,
      inputs.registryToken,
    );
    logger.debug(`Registry manifest contents:\n${JSON.stringify(latestPackageDetails)}`);

    /* Get the version details */
    const packageJsonVersion = semver.parse(packageJson.version);
    let gitHistoryRange: Parameters<typeof git.getHistory>[0];
    let currentVersion: SemVer | null;
    let nextVersion: SemVer | null;
    let incrementType: ReleaseType | '';

    if (latestPackageDetails) {
      if (latestPackageDetails.gitHead === github.context.sha) {
        logger.info('GitHub SHA matches latest release SHA, exiting.');
        return;
      }

      currentVersion = semver.parse(latestPackageDetails.version);
      if (!currentVersion) {
        throw new Error(
          `The current version in the registry "${latestPackageDetails.version}" is not a valid semver value.`,
        );
      }

      const currentTag = `v${currentVersion.toString()}${inputs.gitTagSuffix}`;
      gitHistoryRange = { fromTag: currentTag, fromSha: latestPackageDetails.gitHead, toSha: github.context.sha };
    } else if (packageJsonVersion) {
      currentVersion = packageJsonVersion;
      logger.warning(
        `The package was not found in the registry. The version from the package json "${packageJsonVersion.toString()}" will be used as the current version.`,
      );
    } else {
      currentVersion = new SemVer('v0.0.0');
      logger.warning(
        `The package was not found in the registry. The version "v0.0.0" will be used as the current version.`,
      );
    }

    const gitHistory = await git.getHistory(gitHistoryRange);

    if (inputs.versionOverride) {
      incrementType = semver.diff(currentVersion, inputs.versionOverride) ?? '';
      nextVersion = inputs.versionOverride;
    } else {
      logger.debug(
        `Using git history to determine increment type:\n${JSON.stringify(gitHistory, undefined, JSON_INDENT)}`,
      );
      incrementType = getIncrementType(gitHistory, inputs.majorTypes, inputs.minorTypes);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- semver.parse with semver object as input returns the same object
      nextVersion = semver.parse(currentVersion.version)!.inc(incrementType);
    }

    logger.info(`Current package version: ${currentVersion.toString()}`);
    logger.info(`Next package version: ${nextVersion.toString()}`);
    logger.info(`Increment Type: ${incrementType}`);

    /* Update the version in the package.json for the package being published */
    if (packageJson.version !== nextVersion.version) {
      packageJson.version = nextVersion.version;
      if (inputs.dryRun) {
        logger.info(`DRY RUN: Updating package json with next version: "${packagePath}"`);
      } else {
        logger.debug(`Updating package json with next version: "${packagePath}"`);
        files.writePackageJson(packagePath, packageJson);
      }
    }

    /* Publish the package to the registry */
    await registry.publishPackage(scriptsPackagePath, packagePath, packageJson, inputs.private, inputs.dryRun);

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
        logger.info(`DRY RUN: Git tags to be added/updated: ${JSON.stringify(tags)}`);
      } else {
        logger.debug(`Git tags to be added/updated: ${JSON.stringify(tags)}`);
        await git.addTags(tags);
        await git.pushTags();
      }
    }

    /* Create release notes and GitHub Release */
    if (!inputs.dryRun && inputs.enableGithubRelease) {
      logger.info('Creating GitHub Release');

      const getReleaseTitle = async (): Promise<string> => {
        if (inputs.releaseTitle) {
          return inputs.releaseTitle;
        }
        if (inputs.getReleaseTitleFromPr) {
          const response = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
            ...github.context.repo,
            commit_sha: github.context.sha,
          });
          const releaseTitle = response.data[0]?.title;
          if (!releaseTitle) {
            return newTag;
          }
          return inputs.prependVersionToReleaseTitle ? `${newTag} - ${releaseTitle}` : releaseTitle;
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

      logger.debug(`GitHub Release Details: ${JSON.stringify(releaseDetails)}`);
      await octokit.rest.repos.createRelease(releaseDetails);
    }

    /* Set the action outputs */
    workflow.setOutput('current-version', currentVersion.version);
    workflow.setOutput('increment-type', incrementType);
    workflow.setOutput('next-version', nextVersion.version);
    workflow.setOutput('next-version-major', nextVersion.major);
    workflow.setOutput('next-version-minor', nextVersion.minor);
    workflow.setOutput('next-version-patch', nextVersion.patch);
  } catch (error: unknown) {
    workflow.setFailed(error instanceof Error ? error : String(error));
  }
}
