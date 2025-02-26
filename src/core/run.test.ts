import path from 'node:path';
import { fs, vol } from 'memfs';
import yaml from 'yaml';
import { FilesService } from '../services/FilesService.js';
import { GitHistoryEntry, GitService } from '../services/GitService.js';
import { PackageRegistryService } from '../services/PackageRegistryService.js';
import { run } from './run.js';
import { getGitHubMock } from '__mocks__/getGitHubMock.js';
import { getGitMock } from '__mocks__/getGitMock.js';
import { getLoggerMock } from '__mocks__/getLoggerMock.js';
import { WorkflowMock } from '__mocks__/WorkflowMock.js';
import { PackageJsonSchema } from 'src/types/schemas.js';

vi.mock('node:fs');
const nodeFs = await vi.importActual<typeof import('node:fs')>('node:fs');

function makeGitHistory(values: Partial<GitHistoryEntry>): GitHistoryEntry {
  return {
    hash: '<hash>',
    date: '<date>',
    message: '<message>',
    refs: '<refs>',
    body: '<body>',
    author_name: '<author_name>',
    author_email: '<author_email>',
    ...values,
  };
}

describe(run.name, () => {
  const actionFilePath = path.join(import.meta.dirname, '..', '..', 'action.yml');
  const actionFile = yaml.parse(nodeFs.readFileSync(actionFilePath).toString());

  const loggerMock = getLoggerMock();
  const gitMock = getGitMock();
  const execMock = vi.fn();

  const { gitHubMock, getOctokitSpy, listPullRequestsAssociatedWithCommitSpy, createReleaseSpy } = getGitHubMock();
  const workflow = new WorkflowMock();
  const git = new GitService(loggerMock, gitMock);
  const files = new FilesService();
  const registry = new PackageRegistryService(loggerMock, files, execMock);
  const setFailedSpy = vi.spyOn(workflow, 'setFailed');
  const setOutputSpy = vi.spyOn(workflow, 'setOutput');

  const homeDir = path.join('/', 'home');
  const repoDir = path.join('/', 'repo');
  const npmrcPath = path.join(homeDir, '.npmrc');
  const packageJsonPath = path.join(repoDir, 'package.json');
  const getLatestPackageDetailsSpy = vi.spyOn(registry, 'getLatestPackageDetails');
  const publishPackageSpy = vi.spyOn(registry, 'publishPackage');
  const getHistorySpy = vi.spyOn(git, 'getHistory');
  const packageJson = { name: 'name', version: '0.1.0' };
  const registryDetails = { name: 'name', version: '1.0.0', gitHead: 'gitHead' };

  beforeEach(() => {
    vi.stubEnv('GITHUB_WORKSPACE', repoDir);
    vi.stubEnv('HOME', homeDir);
    fs.mkdirSync(homeDir);
    fs.mkdirSync(repoDir);
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));
    workflow.reset(true);
    getLatestPackageDetailsSpy.mockResolvedValue(registryDetails);
    getHistorySpy.mockResolvedValue([]);
  });

  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('should set all of the output values defined in the action.yml file', async () => {
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = setOutputSpy.mock.calls.map(([x]) => x).sort();
    const expected = Object.keys(actionFile.outputs).sort();
    expect(actual).toStrictEqual(expected);
  });

  it('should fail with an Error if the "GITHUB_WORKSPACE" env var is not set', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- Typedef for stubEnv requires a value
    vi.stubEnv('GITHUB_WORKSPACE', undefined);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = new Error(
      'Unable to retrieve the current working directory using environment variable "GITHUB_WORKSPACE".',
    );
    expect(setFailedSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should pass the GitHub token to the Octokit', async () => {
    const token = '<myGitHubToken>';
    workflow.setInputValue('github-token', token);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(getOctokitSpy).toHaveBeenCalledExactlyOnceWith(token);
  });

  it('should fail with an Error if the registry package version is invalid', async () => {
    getLatestPackageDetailsSpy.mockResolvedValue({ name: 'name', version: 'invalid-version', gitHead: 'gitHead' });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = new Error('The current version in the registry "invalid-version" is not a valid semver value.');
    expect(setFailedSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should use the current version from the package.json file if there is no version published to the registry', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- Typedef requires a value
    getLatestPackageDetailsSpy.mockResolvedValue(undefined);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('current-version', packageJson.version);
  });

  it('should use the current version as "0.0.0" if there is no version published to the registry and the package.json version is invalid', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- Typedef requires a value
    getLatestPackageDetailsSpy.mockResolvedValue(undefined);
    fs.writeFileSync(path.join(repoDir, 'package.json'), JSON.stringify({ name: 'name', version: 'invalid-version' }));
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('current-version', '0.0.0');
  });

  it('should override the next version provided by the "version-override" input', async () => {
    workflow.setInputValue('version-override', '2.0.0');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('next-version', '2.0.0');
  });

  it('should set the correct increment-type when the "version-override" input is for a patch version', async () => {
    workflow.setInputValue('version-override', '1.0.1');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'patch');
  });

  it('should set the correct increment-type when the "version-override" input is for a minor version', async () => {
    workflow.setInputValue('version-override', '1.1.0');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'minor');
  });

  it('should set the correct increment-type when the "version-override" input is for a major version', async () => {
    workflow.setInputValue('version-override', '2.0.0');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'major');
  });

  it('should set the increment type to "patch" when there is no git history', async () => {
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'patch');
  });

  it('should set the increment type to an empty string when the "version-override" input is the same as the current version', async () => {
    workflow.setInputValue('version-override', '1.0.0');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', '');
  });

  it('should increase the patch part of the version when there is no git history', async () => {
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('next-version', '1.0.1');
  });

  it('should write ".npmrc" contents from the provided "npmrc-content" input', async () => {
    const content = 'my\n.npmrc\ncontent';
    workflow.setInputValue('npmrc-content', content);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = fs.readFileSync(npmrcPath).toString();
    expect(actual).toStrictEqual(content);
  });

  it('should write ".npmrc" contents to the default location if no "npmrc-path" input is provided', async () => {
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = fs.readFileSync(npmrcPath).toString();
    expect(actual).toContain('_authToken=');
  });

  it('should write ".npmrc" contents to the path provided by the "npmrc-path" input', async () => {
    const newNpmrcPath = path.join(repoDir, '.npmrc');
    workflow.setInputValue('npmrc-path', newNpmrcPath);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = fs.readFileSync(newNpmrcPath).toString();
    expect(actual).toContain('_authToken=');
  });

  it('should fail if the directory containing the "npmrc-path" does not exist', async () => {
    const newNpmrcPath = path.join('/', 'does', 'not', 'exist', '.npmrc');
    workflow.setInputValue('npmrc-path', newNpmrcPath);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({
      message: expect.stringContaining('ENOENT: no such file or directory'),
      code: 'ENOENT',
      path: path.dirname(newNpmrcPath),
    });
    expect(setFailedSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should use the provided "registry-url" input when writing the .npmrc file', async () => {
    workflow.setInputValue('registry-url', 'http://example.com');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = fs.readFileSync(npmrcPath).toString();
    expect(actual).toContain('http://example.com');
  });

  it('should use the provided "registry-token" input when writing the .npmrc file', async () => {
    workflow.setInputValue('registry-token', '<myExampleToken>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = fs.readFileSync(npmrcPath).toString();
    expect(actual).toContain('<myExampleToken>');
  });

  it('should fail if the package.json file does not exist', async () => {
    fs.unlinkSync(packageJsonPath);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({
      message: expect.stringContaining('ENOENT: no such file or directory'),
      code: 'ENOENT',
      path: packageJsonPath,
    });
    expect(setFailedSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should pass the "registry-url" input to the endpoint', async () => {
    workflow.setInputValue('registry-url', 'https://example.com');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(getLatestPackageDetailsSpy).toHaveBeenCalledExactlyOnceWith(
      new URL('https://example.com'),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should use the package name from the package.json file when querying the endpoint', async () => {
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(getLatestPackageDetailsSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      packageJson.name,
      expect.anything(),
    );
  });

  it('should pass the "registry-token" input to the endpoint', async () => {
    workflow.setInputValue('registry-token', '<myExampleToken>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(getLatestPackageDetailsSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expect.anything(),
      '<myExampleToken>',
    );
  });

  it('should return without setting any outputs if the sha of the current commit matches the latest sha in the registry', async () => {
    getLatestPackageDetailsSpy.mockResolvedValue({ ...registryDetails, gitHead: gitHubMock.context.sha });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).not.toHaveBeenCalled();
  });

  it('should return without failing if the sha of the current commit matches the latest sha in the registry', async () => {
    getLatestPackageDetailsSpy.mockResolvedValue({ ...registryDetails, gitHead: gitHubMock.context.sha });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setFailedSpy).not.toHaveBeenCalled();
  });

  it('should increment a patch version if the git history only contains patch related nodes', async () => {
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'fix: Fix' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'patch');
  });

  it('should increment a minor version if the git history contains a minor change and a patch change', async () => {
    getHistorySpy.mockResolvedValue([
      makeGitHistory({ message: 'feat: Feature' }),
      makeGitHistory({ message: 'fix: Fix' }),
    ]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'minor');
  });

  it('should increment a major version if the git history contains a major change and a minor and a patch change', async () => {
    getHistorySpy.mockResolvedValue([
      makeGitHistory({ message: 'feat!: Major Feature' }),
      makeGitHistory({ message: 'feat: Feature' }),
      makeGitHistory({ message: 'fix: Fix' }),
    ]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'major');
  });

  it('should increment a major version if the git history contains a major change from the major types input', async () => {
    workflow.setInputValue('major-types', 'special');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'special: Major Feature' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'major');
  });

  it('should increment a minor version if the git history contains a minor change from the minor types input', async () => {
    workflow.setInputValue('minor-types', 'special');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'special: minor Feature' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setOutputSpy).toHaveBeenCalledWith('increment-type', 'minor');
  });

  it('should update the package.json file with the new version', async () => {
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'feat!: Major Feature' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = (JSON.parse(fs.readFileSync(packageJsonPath).toString()) as PackageJsonSchema).version;
    expect(actual).toBe('2.0.0');
  });

  it('should not update version in the package.json file when the "dry-run" input is set to true', async () => {
    workflow.setInputValue('dry-run', 'true');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'feat!: Major Feature' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const actual = (JSON.parse(fs.readFileSync(packageJsonPath).toString()) as PackageJsonSchema).version;
    expect(actual).toBe(packageJson.version);
  });

  it('should submit the GitHub release with the changelog details based on the commit messages', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'feat!: <majorFeatureSummary>' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ body: expect.stringContaining('<majorFeatureSummary>') });
    expect(createReleaseSpy).toHaveBeenCalledWith(expected);
  });

  it('should use the version tag as the release title by default', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ name: 'v1.0.1' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should get the release title from the PR when the "get-release-title-from-pr" input is set to true', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('get-release-title-from-pr', 'true');
    listPullRequestsAssociatedWithCommitSpy.mockResolvedValue({ status: 200, data: [{ title: '<prTitle>' }] });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ name: '<prTitle>' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should fail when the "get-release-title-from-pr" input is set to true and there is an error when querying GitHub for the PR title', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('get-release-title-from-pr', 'true');
    const error = new Error('Failed to get PRs associated with commit');
    listPullRequestsAssociatedWithCommitSpy.mockRejectedValue(error);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(setFailedSpy).toHaveBeenCalledExactlyOnceWith(error);
  });

  it('should fallback to the version tag release title when the "get-release-title-from-pr" input is set to true and there are no PR details found', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('get-release-title-from-pr', 'true');
    listPullRequestsAssociatedWithCommitSpy.mockResolvedValue({ status: 200, data: [] });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ name: 'v1.0.1' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should prepend the version to the release title when the "get-release-title-from-pr" and "prepend-version-to-release-title" inputs are both set to true', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('get-release-title-from-pr', 'true');
    workflow.setInputValue('prepend-version-to-release-title', 'true');
    listPullRequestsAssociatedWithCommitSpy.mockResolvedValue({ status: 200, data: [{ title: '<prTitle>' }] });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ name: 'v1.0.1 - <prTitle>' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should pass the correct repo info and commit sha to the GitHub request for listing associated pull requests', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('get-release-title-from-pr', 'true');
    workflow.setInputValue('prepend-version-to-release-title', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ ...gitHubMock.context.repo, commit_sha: gitHubMock.context.sha });
    expect(listPullRequestsAssociatedWithCommitSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should use the release title provided by the "release-title" input', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('release-title', '<overrideReleaseTitle>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ name: '<overrideReleaseTitle>' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should set the tag_name for the GitHub release to the new version tag', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ tag_name: 'v1.0.1' });
    expect(createReleaseSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should not submit a GitHub release when the input "enable-github-release" is false', async () => {
    workflow.setInputValue('enable-github-release', 'false');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(createReleaseSpy).not.toHaveBeenCalled();
  });

  it('should not submit a GitHub release when the inputs "dry-run" and "enable-github-release" are true', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('dry-run', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(createReleaseSpy).not.toHaveBeenCalled();
  });

  it('should not publish the package to the registry when the "dry-run" input is set to true', async () => {
    workflow.setInputValue('dry-run', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(execMock).not.toHaveBeenCalled();
  });

  it('should not add git tags when the "dry-run" input is set to true', async () => {
    workflow.setInputValue('dry-run', 'true');
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(addTagsSpy).not.toHaveBeenCalled();
  });

  it('should not push git tags when the "dry-run" input is set to true', async () => {
    workflow.setInputValue('dry-run', 'true');
    const pushTagsSpy = vi.spyOn(git, 'pushTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(pushTagsSpy).not.toHaveBeenCalled();
  });

  it('should not add git tags when the "disable-git-tagging" input is set to true', async () => {
    workflow.setInputValue('disable-git-tagging', 'true');
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(addTagsSpy).not.toHaveBeenCalled();
  });

  it('should not push git tags when the "disable-git-tagging" input is set to true', async () => {
    workflow.setInputValue('disable-git-tagging', 'true');
    const pushTagsSpy = vi.spyOn(git, 'pushTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(pushTagsSpy).not.toHaveBeenCalled();
  });

  it('should call addTags before pushTags when updating the tags', async () => {
    const calls: string[] = [];
    vi.spyOn(git, 'addTags').mockImplementationOnce(() => {
      return Promise.resolve(calls.push('addTags')) as any;
    });
    vi.spyOn(git, 'pushTags').mockImplementationOnce(() => {
      return Promise.resolve(calls.push('pushTags')) as any;
    });
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(calls).toStrictEqual(['addTags', 'pushTags']);
  });

  it('should update the "latest" tag', async () => {
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.arrayContaining(['latest']);
    expect(addTagsSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should update the latest tag using the tag name provided by the "latest-tag-name" input', async () => {
    workflow.setInputValue('latest-tag-name', '<latestTagInput>');
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.arrayContaining(['<latestTagInput>']);
    expect(addTagsSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should update the version tags for the major, major with minor, and major with minor and patch versions', async () => {
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.arrayContaining(['v1', 'v1.0', 'v1.0.1']);
    expect(addTagsSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should use the default changelog titles when the "changelog-titles" input is empty', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.clearInputValue('changelog-titles');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'feat!: <majorFeatureSummary>' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ body: expect.stringContaining('BREAKING CHANGES') });
    expect(createReleaseSpy).toHaveBeenCalledWith(expected);
  });

  it('should use the changelog titles provided by the "changelog-titles" input', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('changelog-titles', '{ "feat": "<featureTitle>" }');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'feat: <featureSummary>' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ body: expect.stringContaining('<featureTitle>') });
    expect(createReleaseSpy).toHaveBeenCalledWith(expected);
  });

  it('should use the values provided by the "major-types" input when grouping entries for the changelog', async () => {
    workflow.setInputValue('enable-github-release', 'true');
    workflow.setInputValue('major-types', 'example');
    getHistorySpy.mockResolvedValue([makeGitHistory({ message: 'example: <summary>' })]);
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ body: expect.stringContaining('BREAKING CHANGES') });
    expect(createReleaseSpy).toHaveBeenCalledWith(expected);
  });

  it('should append the value from the "git-tag-suffix" input to the git tags', async () => {
    workflow.setInputValue('git-tag-suffix', '<suffix>');
    const addTagsSpy = vi.spyOn(git, 'addTags');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.arrayContaining(['v1<suffix>', 'v1.0<suffix>', 'v1.0.1<suffix>']);
    expect(addTagsSpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should append the value from the "git-tag-suffix" input to the fromTag used for the git history query', async () => {
    workflow.setInputValue('git-tag-suffix', '<suffix>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = expect.objectContaining({ fromTag: `v${registryDetails.version}<suffix>` });
    expect(getHistorySpy).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('should use the package.json file in the location provided by the "package-directory" input', async () => {
    const altDir = path.join(repoDir, 'alt_directory');
    const altPackageJson = { ...packageJson, name: '<altPackageName>' };
    fs.mkdirSync(altDir);
    fs.writeFileSync(path.join(altDir, 'package.json'), JSON.stringify(altPackageJson));
    workflow.setInputValue('package-directory', 'alt_directory');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    expect(getLatestPackageDetailsSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      altPackageJson.name,
      expect.anything(),
    );
  });

  it('should use the value from the "private" when publishing the package when it is true', async () => {
    workflow.setInputValue('private', 'true');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = true;
    expect(publishPackageSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expected,
      expect.anything(),
    );
  });

  it('should use the value from the "private" when publishing the package when it is false', async () => {
    workflow.setInputValue('private', 'false');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = false;
    expect(publishPackageSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expected,
      expect.anything(),
    );
  });

  it('should use the value from the "scripts-package-directory" input when publishing the package', async () => {
    workflow.setInputValue('scripts-package-directory', '<scriptsPackageDir>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = path.join(repoDir, '<scriptsPackageDir>', 'package.json');
    expect(publishPackageSpy).toHaveBeenCalledExactlyOnceWith(
      expected,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should use the value from the "package-directory" input when publishing the package', async () => {
    const altDir = path.join(repoDir, '<examplePackageDir>');
    fs.mkdirSync(altDir);
    fs.writeFileSync(path.join(altDir, 'package.json'), JSON.stringify(packageJson));
    workflow.setInputValue('package-directory', '<examplePackageDir>');
    await run(loggerMock, workflow, gitHubMock, git, files, registry);
    const expected = path.join(repoDir, '<examplePackageDir>', 'package.json');
    expect(publishPackageSpy).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      expected,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
