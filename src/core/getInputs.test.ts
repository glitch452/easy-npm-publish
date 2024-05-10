import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { Getters, InputOptions, getInputs } from './getInputs.js';
import { DEFAULT_TYPE_TITLES } from './constants.js';

describe(getInputs.name, () => {
  let lookup: Record<string, string>;

  const requestedInputs = new Set<string>();
  const getters: Getters = {
    getInput(name: string, options?: InputOptions) {
      const value = lookup[name] ?? '';
      requestedInputs.add(name);
      if (options?.required && !value) {
        throw new Error(`Value Required for ${name}`);
      }
      return value;
    },
    getBooleanInput(name: string, options?: InputOptions) {
      return ['true', 'True', 'TRUE'].includes(this.getInput(name, options));
    },
    getMultilineInput(name: string, options?: InputOptions) {
      return this.getInput(name, options).split(/\r?\n/);
    },
  };

  beforeEach(() => {
    lookup = { 'registry-token': '<registryToken>', 'github-token': '<githubToken>' };
  });

  describe('action.yaml', () => {
    it('Should contain exactly the inputs that are requested in the action', () => {
      const actionFilePath = path.join(import.meta.dirname, '..', '..', 'action.yml');
      const actionFile = yaml.parse(fs.readFileSync(actionFilePath).toString());

      getInputs(getters);

      const actual = Object.keys(actionFile.inputs).sort();
      const expected = [...requestedInputs].sort();
      expect(actual).toStrictEqual(expected);
    });
  });

  describe('changelog-titles', () => {
    it('Should return the defaults for "changelog-titles" if a value is not provided', () => {
      lookup['changelog-titles'] = '';
      const actual = getInputs(getters).changelogTitles;
      expect(actual).toStrictEqual(DEFAULT_TYPE_TITLES);
    });

    it('Should return the appended value for "changelog-titles" if it is set to a valid value', () => {
      lookup['changelog-titles'] = '{ "feat": "Awesome Features!" }';
      const actual = getInputs(getters).changelogTitles;
      const expected = { ...DEFAULT_TYPE_TITLES, feat: 'Awesome Features!' };
      expect(actual).toStrictEqual(expected);
    });

    it('Should throw an error if the value is not valid json', () => {
      lookup['changelog-titles'] = 'feat = Awesome Features!';
      const actual = () => getInputs(getters).changelogTitles;
      expect(actual).toThrow();
    });

    it('Should throw an error if the value is valid json but does not conform to the schema', () => {
      lookup['changelog-titles'] = '{ "feat": [ "Awesome Features!" ] }';
      const actual = () => getInputs(getters).changelogTitles;
      expect(actual).toThrow();
    });
  });

  describe('dry-run', () => {
    it('Should return false for "dry-run" if a value is not provided', () => {
      lookup['dry-run'] = '';
      const actual = getInputs(getters).dryRun;
      expect(actual).toStrictEqual(false);
    });

    it('Should return true for "dry-run" if it is set to a true value', () => {
      lookup['dry-run'] = 'true';
      const actual = getInputs(getters).dryRun;
      expect(actual).toStrictEqual(true);
    });
  });

  describe('enableGithubRelease', () => {
    it('Should return true for enableGithubRelease when "enable-github-release" is true', () => {
      lookup['enable-github-release'] = 'true';
      const actual = getInputs(getters).enableGithubRelease;
      expect(actual).toStrictEqual(true);
    });

    it('Should return false for enableGithubRelease when "enable-github-release" is false', () => {
      lookup['enable-github-release'] = 'false';
      const actual = getInputs(getters).enableGithubRelease;
      expect(actual).toStrictEqual(false);
    });

    it('Should return false for enableGithubRelease when "enable-github-release" is not provided', () => {
      lookup['enable-github-release'] = '';
      const actual = getInputs(getters).enableGithubRelease;
      expect(actual).toStrictEqual(false);
    });
  });

  describe('get-release-title-from-pr', () => {
    it('Should return false for "get-release-title-from-pr" if a value is not provided', () => {
      lookup['get-release-title-from-pr'] = '';
      const actual = getInputs(getters).getReleaseTitleFromPr;
      expect(actual).toStrictEqual(false);
    });

    it('Should return true for "get-release-title-from-pr" if it is set to a true value', () => {
      lookup['get-release-title-from-pr'] = 'true';
      const actual = getInputs(getters).getReleaseTitleFromPr;
      expect(actual).toStrictEqual(true);
    });
  });

  describe('enableGitTagging', () => {
    it('Should return false for enableGitTagging when "disable-git-tagging" is true', () => {
      lookup['disable-git-tagging'] = 'true';
      const actual = getInputs(getters).enableGitTagging;
      expect(actual).toStrictEqual(false);
    });

    it('Should return true for enableGitTagging when "disable-git-tagging" is false', () => {
      lookup['disable-git-tagging'] = 'false';
      const actual = getInputs(getters).enableGitTagging;
      expect(actual).toStrictEqual(true);
    });

    it('Should return true for enableGitTagging when "disable-git-tagging" is not provided', () => {
      lookup['disable-git-tagging'] = '';
      const actual = getInputs(getters).enableGitTagging;
      expect(actual).toStrictEqual(true);
    });
  });

  describe('githubToken', () => {
    it('Should throw an error if "disable-git-tagging" is false and the "github-token" is not provided', () => {
      lookup['disable-git-tagging'] = 'false';
      lookup['github-token'] = '';
      const actual = () => getInputs(getters);
      expect(actual).toThrow('github-token');
    });

    it('Should return the provided "github-token"', () => {
      lookup['github-token'] = '<githubToken>';
      const actual = getInputs(getters).githubToken;
      expect(actual).toStrictEqual('<githubToken>');
    });
  });

  describe('gitTagSuffix', () => {
    it('Should return the provided "git-tag-suffix"', () => {
      lookup['git-tag-suffix'] = '<gitTagSuffix>';
      const actual = getInputs(getters).gitTagSuffix;
      expect(actual).toStrictEqual('<gitTagSuffix>');
    });
  });

  describe('latestTagName', () => {
    it('Should return the default "latest-tag-name" if it is not provided', () => {
      lookup['latest-tag-name'] = '';
      const actual = getInputs(getters).latestTagName;
      expect(actual).toStrictEqual('latest');
    });

    it('Should return the provided "latest-tag-name"', () => {
      lookup['latest-tag-name'] = '<latestTagName>';
      const actual = getInputs(getters).latestTagName;
      expect(actual).toStrictEqual('<latestTagName>');
    });
  });

  describe('majorTypes', () => {
    it('Should return an empty list of no major types are provided', () => {
      lookup['major-types'] = '';
      const actual = getInputs(getters).majorTypes;
      expect(actual).toStrictEqual([]);
    });

    it('Should return the provided "major-types"', () => {
      lookup['major-types'] = '<major1>,<major2>';
      const actual = getInputs(getters).majorTypes;
      expect(actual).toStrictEqual(['<major1>', '<major2>']);
    });
  });

  describe('minorTypes', () => {
    it('Should return the default "minor-types" if it is not provided', () => {
      lookup['minor-types'] = '';
      const actual = getInputs(getters).minorTypes;
      expect(actual).toStrictEqual(['feat']);
    });

    it('Should return the provided "minor-types"', () => {
      lookup['minor-types'] = '<minor1>,<minor2>';
      const actual = getInputs(getters).minorTypes;
      expect(actual).toStrictEqual(['<minor1>', '<minor2>']);
    });
  });

  describe('npmrcContent', () => {
    it('Should return the provided "npmrc-content"', () => {
      lookup['npmrc-content'] = '<npmrcContent>\nLine2';
      const actual = getInputs(getters).npmrcContent;
      expect(actual).toStrictEqual('<npmrcContent>\nLine2');
    });
  });

  describe('npmrcPath', () => {
    it('Should return the default "npmrc-path" if it is not provided', () => {
      lookup['npmrc-path'] = '';
      vi.stubEnv('HOME', '<home>');
      const actual = getInputs(getters).npmrcPath;
      expect(actual).toStrictEqual(path.join('<home>', '.npmrc'));
      vi.unstubAllEnvs();
    });

    it('Should return the default "npmrc-path" if it is not provided and HOME is not set', () => {
      lookup['npmrc-path'] = '';
      const old = process.env.HOME;
      delete process.env.HOME;
      const actual = getInputs(getters).npmrcPath;
      expect(actual).toStrictEqual('.npmrc');
      process.env.HOME = old;
    });

    it('Should return the provided "npmrc-path"', () => {
      lookup['npmrc-path'] = '<npmrcPath>';
      const actual = getInputs(getters).npmrcPath;
      expect(actual).toStrictEqual('<npmrcPath>');
    });
  });

  describe('packageDirectory', () => {
    it('Should return the default "package-directory" if it is not provided', () => {
      lookup['package-directory'] = '';
      const actual = getInputs(getters).packageDirectory;
      expect(actual).toStrictEqual('.');
    });

    it('Should return the provided "package-directory"', () => {
      lookup['package-directory'] = '<packageDirectory>';
      const actual = getInputs(getters).packageDirectory;
      expect(actual).toStrictEqual('<packageDirectory>');
    });
  });

  describe('scriptsPackageDirectory', () => {
    it('Should return the default "scripts-package-directory" if it and the "package-directory" are not provided', () => {
      lookup['package-directory'] = '';
      lookup['scripts-package-directory'] = '';
      const actual = getInputs(getters).scriptsPackageDirectory;
      expect(actual).toStrictEqual('.');
    });

    it('Should return the "package-directory" value if one is provided and the "scripts-package-directory" is not provided', () => {
      lookup['package-directory'] = '<packageDirectory>';
      lookup['scripts-package-directory'] = '';
      const actual = getInputs(getters).scriptsPackageDirectory;
      expect(actual).toStrictEqual('<packageDirectory>');
    });

    it('Should return the provided "scripts-package-directory"', () => {
      lookup['scripts-package-directory'] = '<scriptsPackageDirectory>';
      const actual = getInputs(getters).scriptsPackageDirectory;
      expect(actual).toStrictEqual('<scriptsPackageDirectory>');
    });
  });

  describe('private', () => {
    it('Should return false for "private" if a value is not provided', () => {
      lookup.private = '';
      const actual = getInputs(getters).private;
      expect(actual).toStrictEqual(false);
    });

    it('Should return true for "private" if it is set to a true value', () => {
      lookup.private = 'true';
      const actual = getInputs(getters).private;
      expect(actual).toStrictEqual(true);
    });
  });

  describe('registryToken', () => {
    it('Should throw an error if the "registry-token" is not provided', () => {
      lookup['registry-token'] = '';
      const actual = () => getInputs(getters);
      expect(actual).toThrow('registry-token');
    });

    it('Should return the registry token', () => {
      lookup['registry-token'] = '<registryToken>';
      const actual = getInputs(getters).registryToken;
      expect(actual).toStrictEqual('<registryToken>');
    });
  });

  describe('registryUrl', () => {
    it('Should return the default registry url if a value is not provided', () => {
      const actual = getInputs(getters).registryUrl.href;
      expect(actual).toStrictEqual('https://registry.npmjs.org/');
    });

    it('Should return the registry url', () => {
      lookup['registry-url'] = 'https://registry-url.com';
      const actual = getInputs(getters).registryUrl.href;
      expect(actual).toStrictEqual('https://registry-url.com/');
    });

    it('Should return the registry url using https if no protocol is provided', () => {
      lookup['registry-url'] = 'registry-url.com';
      const actual = getInputs(getters).registryUrl.href;
      expect(actual).toStrictEqual('https://registry-url.com/');
    });

    it('Should return the registry url using http if the http protocol is provided', () => {
      lookup['registry-url'] = 'http://registry-url.com';
      const actual = getInputs(getters).registryUrl.href;
      expect(actual).toStrictEqual('http://registry-url.com/');
    });
  });

  describe('releaseTitle', () => {
    it('Should return an empty string if a value is not provided', () => {
      const actual = getInputs(getters).releaseTitle;
      expect(actual).toStrictEqual('');
    });

    it('Should return the provided "release-title"', () => {
      lookup['release-title'] = '<releaseTitle>';
      const actual = getInputs(getters).releaseTitle;
      expect(actual).toStrictEqual('<releaseTitle>');
    });
  });

  describe('versionOverride', () => {
    it('Should return null if no "version-override" is provided', () => {
      lookup['version-override'] = '';
      const actual = getInputs(getters).versionOverride;
      expect(actual).toStrictEqual(null);
    });

    it('Should return the provided "version-override"', () => {
      lookup['version-override'] = '0.1.2';
      const actual = getInputs(getters).versionOverride?.version;
      expect(actual).toStrictEqual('0.1.2');
    });

    it('Should throw an error if the "version-override" is not a valid semver value', () => {
      lookup['version-override'] = '<version-override>';
      const actual = () => getInputs(getters).versionOverride;
      expect(actual).toThrow('valid semver');
    });
  });
});
