# Easy NPM Publish

Use [Conventional Commits](https://www.conventionalcommits.org) to automatically update the package version, update the
git tags and publish the package.

## Table of Contents

- [Easy NPM Publish](#easy-npm-publish)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Inputs](#inputs)
  - [Outputs](#outputs)
  - [Example Usage](#example-usage)

## Features

- Use the version information in the registry so there is no need to update the repo with the current version.
- Automatically determine the next version based on the commit messages since the last version, using
  [Conventional Commits](https://www.conventionalcommits.org) to determine whether to bump the major, minor or patch
  component of the [semver](https://semver.org) package version.
- Publish to an npm compatible registry ([NPM](https://www.npmjs.com) by default, compatible with
  [GitHub Packages](https://docs.github.com/en/packages))
- Automatically add tags to the branch
  - The `latest` tag gets set/moved to the current commit
  - A tag with the latest version gets added to the current commit (i.e. `v1.2.3`)
  - A tag with the major and minor version gets set/moved (i.e. `v1.2`)
  - A tag with the major version gets set/moved (i.e. `v1`)

## Inputs

| Input Name                  | Type      | Details                                                                                                                                                                                                                                                                                                                                |
| :-------------------------- | :-------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry-token`            | `string`  | **REQUIRED** - An auth token with access to publish to the registry.                                                                                                                                                                                                                                                                   |
| `github-token`              | `string`  | **REQUIRED / Optional** - A github token with access to write tags and releases to the repository. Required if git tagging is enabled, otherwise optional.                                                                                                                                                                             |
| `changelog-titles`          | `string`  | A JSON encoded object, mapping the conventional commit type to the section title to use in the changelog for that type. These values will be merged into and override the default titles. (ex. `'{ "feat": "New Features" }'`) **Default:** `'{}'`                                                                                     |
| `disable-git-tagging`       | `boolean` | Disable setting and/or updating the git tags. **Default:** `false`                                                                                                                                                                                                                                                                     |
| `dry-run`                   | `boolean` | Run the action without actually publishing the package or pushing git tags. **Default:** `false`                                                                                                                                                                                                                                       |
| `enable-github-release`     | `boolean` | Create a GitHub Release. **Default:** `false`                                                                                                                                                                                                                                                                                          |
| `get-release-title-from-pr` | `boolean` | Attempt to get the PR title from a PR associated to the git sha. If it is found, use the PR title as the release title. If not found, fall back to the release tag name. If the `release-title` has a truthy value, it will override this option. Note: The GITHUB_TOKEN requires pull-request: read permissions. **Default:** `false` |
| `git-tag-suffix`            | `string`  | A value append to the git tags. **Default:** `''`                                                                                                                                                                                                                                                                                      |
| `major-types`               | `string`  | A comma-separated list of conventional commit types that trigger a major version change. **Default:** `''`                                                                                                                                                                                                                             |
| `minor-types`               | `string`  | A comma-separated list of conventional commit types that trigger a minor version change. **Default:** `'feat'`                                                                                                                                                                                                                         |
| `npmrc-content`             | `string`  | Manually set the contents of the .npmrc file written to the `npmrc-path` location. **Default:** `''`                                                                                                                                                                                                                                   |
| `npmrc-path`                | `string`  | A path to the `.npmrc` file. **Default:** `'$HOME/.npmrc'`                                                                                                                                                                                                                                                                             |
| `package-directory`         | `string`  | The path to the directory containing the package to be published. It must be a relative path, relative to the root of the repository. **Default:** `'.'`                                                                                                                                                                               |
| `private`                   | `boolean` | Whether to publish the package as a `private` package. **Default:** `false`                                                                                                                                                                                                                                                            |
| `registry-url`              | `string`  | The URL of the package registry to publish to. Use `'npm.pkg.github.com'` for GitHub Packages. **Default:** `'registry.npmjs.org'`                                                                                                                                                                                                     |
| `release-title`             | `string`  | The title to use for the GitHub release. If not set, or an empty string, the release tag name will be used.                                                                                                                                                                                                                            |
| `scripts-package-directory` | `string`  | The path to a directory containing a package.json file which contains the project's scripts. Set this to use a custom `publish` script in the package.json file. It must be a relative path, relative to the root of the repository. **Default:** The value of the input `package-directory`                                           |
| `version-override`          | `string`  | The version to use for publishing the package instead of determining the version using conventional commits. **Default:** `''`                                                                                                                                                                                                         |

## Outputs

| Output Name          | Details                                                                         |
| :------------------- | :------------------------------------------------------------------------------ |
| `current-version`    | The version of the package before it is updated (ex. `1.2.2`).                  |
| `increment-type`     | The type of version increment (if applicable) in `['major', 'minor', 'patch']`. |
| `next-version`       | The new version of the package (ex. `1.2.3`).                                   |
| `next-version-major` | The major portion of the new version of the package (ex. `1`).                  |
| `next-version-minor` | The minor portion of the new version of the package (ex. `2`).                  |
| `next-version-patch` | The patch portion of the new version of the package (ex. `3`).                  |

## Example Usage

```yaml
jobs:
  publish:
    name: Publish the NPM Package
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Publish the Package to NPM
        id: publish_npm
        uses: glitch452/easy-npm-publish@v1
        with:
          registry-token: ${{ secrets.NPM_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          package-directory: dist

      - name: Publish the Package to GitHub
        id: publish_github
        uses: glitch452/easy-npm-publish@v1
        with:
          registry-url: npm.pkg.github.com
          registry-token: ${{ secrets.GITHUB_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          package-directory: dist
          version-override: ${{ steps.publish_npm.outputs.next-version }}
          disable-git-tagging: true

      - name: Print Outputs
        run: |
          echo "${{ toJSON(steps.publish_npm.outputs) }}"
          echo "${{ toJSON(steps.publish_github.outputs) }}"
```
