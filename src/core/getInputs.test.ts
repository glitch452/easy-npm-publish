import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { DEFAULT_TYPE_TITLES } from './constants.js';
import { getInputs } from './getInputs.js';
import { WorkflowMock } from '__mocks__/WorkflowMock.js';

describe(getInputs.name, () => {
  const workflowMock = new WorkflowMock();

  beforeEach(() => {
    workflowMock.reset(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('action.yml', () => {
    const actionFilePath = path.join(import.meta.dirname, '..', '..', 'action.yml');
    const actionFile = yaml.parse(fs.readFileSync(actionFilePath).toString());

    it('should request all and only the inputs that are listed in the action', () => {
      getInputs(workflowMock);

      const actual = Object.keys(actionFile.inputs).sort();
      const expected = [...workflowMock.requestedInputs].sort();
      expect(actual).toStrictEqual(expected);
    });

    const requiredInputNames = Object.entries<any>(actionFile.inputs)
      .filter(([, { required }]) => required)
      .map(([x]) => x);

    it.each(requiredInputNames)('Should throw an error if the required field "%s" is not provided', (inputName) => {
      // This ensures that all inputs marked 'required' in the yaml file also have the required flag set on the input options
      workflowMock.clearInputValue(inputName);
      const actual = () => getInputs(workflowMock);
      expect(actual).toThrow(`Value Required for ${inputName}`);
    });
  });

  describe('changelogTitles', () => {
    it('should return the defaults for "changelog-titles" if a value is not provided', () => {
      workflowMock.clearInputValue('changelog-titles');
      const actual = getInputs(workflowMock).changelogTitles;
      expect(actual).toStrictEqual(DEFAULT_TYPE_TITLES);
    });

    it('should return the appended value for "changelog-titles" if it is set to a valid value', () => {
      workflowMock.setInputValue('changelog-titles', '{ "feat": "Awesome Features!" }');
      const actual = getInputs(workflowMock).changelogTitles;
      const expected = { ...DEFAULT_TYPE_TITLES, feat: 'Awesome Features!' };
      expect(actual).toStrictEqual(expected);
    });

    it('should throw an error if the value is not valid json', () => {
      workflowMock.setInputValue('changelog-titles', 'feat = Awesome Features!');
      const actual = () => getInputs(workflowMock).changelogTitles;
      expect(actual).toThrow();
    });

    it('should throw an error if the value is valid json but does not conform to the schema', () => {
      workflowMock.setInputValue('changelog-titles', '{ "feat": [ "Awesome Features!" ] }');
      const actual = () => getInputs(workflowMock).changelogTitles;
      expect(actual).toThrow();
    });
  });

  describe('dryRun', () => {
    it('should return false for "dry-run" if a value is not provided', () => {
      workflowMock.clearInputValue('dry-run');
      const actual = getInputs(workflowMock).dryRun;
      expect(actual).toBe(false);
    });

    it('should return true for "dry-run" if it is set to a true value', () => {
      workflowMock.setInputValue('dry-run', 'true');
      const actual = getInputs(workflowMock).dryRun;
      expect(actual).toBe(true);
    });
  });

  describe('enableGithubRelease', () => {
    it('should return true for enableGithubRelease when "enable-github-release" is true', () => {
      workflowMock.setInputValue('enable-github-release', 'true');
      const actual = getInputs(workflowMock).enableGithubRelease;
      expect(actual).toBe(true);
    });

    it('should return false for enableGithubRelease when "enable-github-release" is false', () => {
      workflowMock.setInputValue('enable-github-release', 'false');
      const actual = getInputs(workflowMock).enableGithubRelease;
      expect(actual).toBe(false);
    });

    it('should return false for enableGithubRelease when "enable-github-release" is not provided', () => {
      workflowMock.clearInputValue('enable-github-release');
      const actual = getInputs(workflowMock).enableGithubRelease;
      expect(actual).toBe(false);
    });
  });

  describe('getReleaseTitleFromPr', () => {
    it('should return false for "get-release-title-from-pr" if a value is not provided', () => {
      workflowMock.clearInputValue('get-release-title-from-pr');
      const actual = getInputs(workflowMock).getReleaseTitleFromPr;
      expect(actual).toBe(false);
    });

    it('should return true for "get-release-title-from-pr" if it is set to a true value', () => {
      workflowMock.setInputValue('get-release-title-from-pr', 'true');
      const actual = getInputs(workflowMock).getReleaseTitleFromPr;
      expect(actual).toBe(true);
    });
  });

  describe('enableGitTagging', () => {
    it('should return false for enableGitTagging when "disable-git-tagging" is true', () => {
      workflowMock.setInputValue('disable-git-tagging', 'true');
      const actual = getInputs(workflowMock).enableGitTagging;
      expect(actual).toBe(false);
    });

    it('should return true for enableGitTagging when "disable-git-tagging" is false', () => {
      workflowMock.setInputValue('disable-git-tagging', 'false');
      const actual = getInputs(workflowMock).enableGitTagging;
      expect(actual).toBe(true);
    });

    it('should return true for enableGitTagging when "disable-git-tagging" is not provided', () => {
      workflowMock.clearInputValue('disable-git-tagging');
      const actual = getInputs(workflowMock).enableGitTagging;
      expect(actual).toBe(true);
    });
  });

  describe('githubToken', () => {
    it('should throw an error if "disable-git-tagging" is false and the "github-token" is not provided', () => {
      workflowMock.setInputValue('disable-git-tagging', 'false');
      workflowMock.clearInputValue('github-token');
      const actual = () => getInputs(workflowMock);
      expect(actual).toThrow('github-token');
    });

    it('should return the provided "github-token"', () => {
      workflowMock.setInputValue('github-token', '<githubToken>');
      const actual = getInputs(workflowMock).githubToken;
      expect(actual).toBe('<githubToken>');
    });
  });

  describe('gitTagSuffix', () => {
    it('should return the provided "git-tag-suffix"', () => {
      workflowMock.setInputValue('git-tag-suffix', '<gitTagSuffix>');
      const actual = getInputs(workflowMock).gitTagSuffix;
      expect(actual).toBe('<gitTagSuffix>');
    });
  });

  describe('latestTagName', () => {
    it('should return the default "latest-tag-name" if it is not provided', () => {
      workflowMock.clearInputValue('latest-tag-name');
      const actual = getInputs(workflowMock).latestTagName;
      expect(actual).toBe('latest');
    });

    it('should return the provided "latest-tag-name"', () => {
      workflowMock.setInputValue('latest-tag-name', '<latestTagName>');
      const actual = getInputs(workflowMock).latestTagName;
      expect(actual).toBe('<latestTagName>');
    });
  });

  describe('majorTypes', () => {
    it('should return an empty list of no major types are provided', () => {
      workflowMock.clearInputValue('major-types');
      const actual = getInputs(workflowMock).majorTypes;
      expect(actual).toStrictEqual([]);
    });

    it('should return the provided "major-types"', () => {
      workflowMock.setInputValue('major-types', '<major1>,<major2>');
      const actual = getInputs(workflowMock).majorTypes;
      expect(actual).toStrictEqual(['<major1>', '<major2>']);
    });
  });

  describe('minorTypes', () => {
    it('should return the default "minor-types" if it is not provided', () => {
      workflowMock.clearInputValue('minor-types');
      const actual = getInputs(workflowMock).minorTypes;
      expect(actual).toStrictEqual(['feat']);
    });

    it('should return the provided "minor-types"', () => {
      workflowMock.setInputValue('minor-types', '<minor1>,<minor2>');
      const actual = getInputs(workflowMock).minorTypes;
      expect(actual).toStrictEqual(['<minor1>', '<minor2>']);
    });
  });

  describe('npmrcContent', () => {
    it('should return the provided "npmrc-content"', () => {
      workflowMock.setInputValue('npmrc-content', '<npmrcContent>\nLine2');
      const actual = getInputs(workflowMock).npmrcContent;
      expect(actual).toBe('<npmrcContent>\nLine2');
    });
  });

  describe('npmrcPath', () => {
    it('should return the default "npmrc-path" if it is not provided', () => {
      workflowMock.clearInputValue('npmrc-path');
      vi.stubEnv('HOME', '<home>');
      const actual = getInputs(workflowMock).npmrcPath;
      expect(actual).toStrictEqual(path.join('<home>', '.npmrc'));
      vi.unstubAllEnvs();
    });

    it('should return the default "npmrc-path" if it is not provided and HOME is not set', () => {
      workflowMock.clearInputValue('npmrc-path');
      // eslint-disable-next-line unicorn/no-useless-undefined -- Typedef for stubEnv requires a value
      vi.stubEnv('HOME', undefined);
      const actual = getInputs(workflowMock).npmrcPath;
      expect(actual).toBe('.npmrc');
    });

    it('should return the provided "npmrc-path"', () => {
      workflowMock.setInputValue('npmrc-path', '<npmrcPath>');
      const actual = getInputs(workflowMock).npmrcPath;
      expect(actual).toBe('<npmrcPath>');
    });
  });

  describe('packageDirectory', () => {
    it('should return the default "package-directory" if it is not provided', () => {
      workflowMock.clearInputValue('package-directory');
      const actual = getInputs(workflowMock).packageDirectory;
      expect(actual).toBe('.');
    });

    it('should return the provided "package-directory"', () => {
      workflowMock.setInputValue('package-directory', '<packageDirectory>');
      const actual = getInputs(workflowMock).packageDirectory;
      expect(actual).toBe('<packageDirectory>');
    });
  });

  describe('prependVersionToReleaseTitle', () => {
    it('should return false for "prepend-version-to-release-title" if a value is not provided', () => {
      workflowMock.clearInputValue('prepend-version-to-release-title');
      const actual = getInputs(workflowMock).prependVersionToReleaseTitle;
      expect(actual).toBe(false);
    });

    it('should return true for "prepend-version-to-release-title" if it is set to a true value', () => {
      workflowMock.setInputValue('prepend-version-to-release-title', 'true');
      const actual = getInputs(workflowMock).prependVersionToReleaseTitle;
      expect(actual).toBe(true);
    });
  });

  describe('scriptsPackageDirectory', () => {
    it('should return the default "scripts-package-directory" if it and the "package-directory" are not provided', () => {
      workflowMock.clearInputValue('package-directory');
      workflowMock.clearInputValue('scripts-package-directory');
      const actual = getInputs(workflowMock).scriptsPackageDirectory;
      expect(actual).toBe('.');
    });

    it('should return the "package-directory" value if one is provided and the "scripts-package-directory" is not provided', () => {
      workflowMock.setInputValue('package-directory', '<packageDirectory>');
      workflowMock.clearInputValue('scripts-package-directory');
      const actual = getInputs(workflowMock).scriptsPackageDirectory;
      expect(actual).toBe('<packageDirectory>');
    });

    it('should return the provided "scripts-package-directory"', () => {
      workflowMock.setInputValue('scripts-package-directory', '<scriptsPackageDirectory>');
      const actual = getInputs(workflowMock).scriptsPackageDirectory;
      expect(actual).toBe('<scriptsPackageDirectory>');
    });
  });

  describe('private', () => {
    it('should return false for "private" if a value is not provided', () => {
      workflowMock.clearInputValue('private');
      const actual = getInputs(workflowMock).private;
      expect(actual).toBe(false);
    });

    it('should return true for "private" if it is set to a true value', () => {
      workflowMock.setInputValue('private', 'true');
      const actual = getInputs(workflowMock).private;
      expect(actual).toBe(true);
    });
  });

  describe('registryToken', () => {
    it('should throw an error if the "registry-token" is not provided', () => {
      workflowMock.clearInputValue('registry-token');
      const actual = () => getInputs(workflowMock);
      expect(actual).toThrow('registry-token');
    });

    it('should return the registry token', () => {
      workflowMock.setInputValue('registry-token', '<registryToken>');
      const actual = getInputs(workflowMock).registryToken;
      expect(actual).toBe('<registryToken>');
    });
  });

  describe('registryUrl', () => {
    it('should return the default registry url if a value is not provided', () => {
      const actual = getInputs(workflowMock).registryUrl.href;
      expect(actual).toBe('https://registry.npmjs.org/');
    });

    it('should return the registry url', () => {
      workflowMock.setInputValue('registry-url', 'https://registry-url.com');
      const actual = getInputs(workflowMock).registryUrl.href;
      expect(actual).toBe('https://registry-url.com/');
    });

    it('should return the registry url using https if no protocol is provided', () => {
      workflowMock.setInputValue('registry-url', 'registry-url.com');
      const actual = getInputs(workflowMock).registryUrl.href;
      expect(actual).toBe('https://registry-url.com/');
    });

    it('should return the registry url using http if the http protocol is provided', () => {
      workflowMock.setInputValue('registry-url', 'http://registry-url.com');
      const actual = getInputs(workflowMock).registryUrl.href;
      expect(actual).toBe('http://registry-url.com/');
    });
  });

  describe('releaseTitle', () => {
    it('should return an empty string if a value is not provided', () => {
      const actual = getInputs(workflowMock).releaseTitle;
      expect(actual).toBe('');
    });

    it('should return the provided "release-title"', () => {
      workflowMock.setInputValue('release-title', '<releaseTitle>');
      const actual = getInputs(workflowMock).releaseTitle;
      expect(actual).toBe('<releaseTitle>');
    });
  });

  describe('versionOverride', () => {
    it('should return undefined if no "version-override" is provided', () => {
      workflowMock.clearInputValue('version-override');
      const actual = getInputs(workflowMock).versionOverride;
      expect(actual).toBeUndefined();
    });

    it('should return the provided "version-override"', () => {
      workflowMock.setInputValue('version-override', '0.1.2');
      const actual = getInputs(workflowMock).versionOverride?.version;
      expect(actual).toBe('0.1.2');
    });

    it('should throw an error if the "version-override" is not a valid semver value', () => {
      workflowMock.setInputValue('version-override', '<version-override>');
      const actual = () => getInputs(workflowMock).versionOverride;
      expect(actual).toThrow('valid semver');
    });
  });
});
