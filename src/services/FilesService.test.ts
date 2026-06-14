import { fs, vol } from 'memfs';
import { FilesService } from './FilesService.js';

vi.mock('node:fs');

describe(FilesService.name, () => {
  const indent = 2;
  const filesService = new FilesService();

  describe(FilesService.prototype.readPackageJson.name, () => {
    const packageJsonPath = '/package.json';

    beforeEach(() => {
      vol.reset();
    });

    it('should successfully read a properly configured package.json file', () => {
      const contents = { name: '', version: '', scripts: {} };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = filesService.readPackageJson(packageJsonPath);
      const expected = contents;
      expect(actual).toStrictEqual(expected);
    });

    it('should successfully read a properly configured package.json file with extra fields', () => {
      const contents = { name: '', version: '', scripts: {}, unknown: 'value' };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = filesService.readPackageJson(packageJsonPath);
      const expected = contents;
      expect(actual).toStrictEqual(expected);
    });

    it('should fail when reading a package.json file with a missing name field', () => {
      const contents = { version: '', scripts: {} };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).toThrow();
    });

    it('should fail when reading a package.json file with an invalid name field', () => {
      const contents = { name: false, version: '', scripts: {} };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).toThrow();
    });

    it('should fail when reading a package.json file with a missing version field', () => {
      const contents = { name: '', scripts: {} };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).toThrow();
    });

    it('should fail when reading a package.json file with an invalid version field', () => {
      const contents = { name: '', version: false, scripts: {} };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).toThrow();
    });

    it('should not fail when reading a package.json file with a missing scripts field', () => {
      const contents = { name: '', version: '' };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).not.toThrow();
    });

    it('should fail when reading a package.json file with an invalid scripts field', () => {
      const contents = { name: '', version: '', scripts: false };
      fs.writeFileSync(packageJsonPath, JSON.stringify(contents, undefined, indent));
      const actual = () => filesService.readPackageJson(packageJsonPath);
      expect(actual).toThrow();
    });
  });

  describe(FilesService.prototype.writePackageJson.name, () => {
    const packageJsonPath = '/package.json';

    beforeEach(() => {
      vol.reset();
    });

    it('should successfully write a package.json file', () => {
      const contents = { name: '', version: '', scripts: {} };
      filesService.writePackageJson(packageJsonPath, contents);
      const actual = fs.readFileSync(packageJsonPath).toString();
      const expected = JSON.stringify(contents, undefined, indent);
      expect(actual).toStrictEqual(expected);
    });
  });

  describe(FilesService.prototype.writeNpmrc.name, () => {
    const npmrcPath = '/.npmrc';

    beforeEach(() => {
      vol.reset();
    });

    it('should successfully write an .npmrc file', () => {
      const contents = '.npmrc\ncontents';
      filesService.writeNpmrc(npmrcPath, contents);
      const actual = fs.readFileSync(npmrcPath).toString();
      const expected = contents;
      expect(actual).toStrictEqual(expected);
    });
  });

  describe(filesService.createNpmrc.name, () => {
    it('should set the auth token for the registry', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = filesService.createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = '//registry.npmjs.org/:_authToken=<token>';
      expect(actual).toContain(expected);
    });

    it('should set the registry url', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = filesService.createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'registry=https://registry.npmjs.org/';
      expect(actual).toContain(expected);
    });

    it('should set strict ssl to true when the registry url has an https scheme', () => {
      const registryToken = '<token>';
      const registryUrl = new URL('https://registry.npmjs.org');
      const actual = filesService.createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'strict-ssl=true';
      expect(actual).toContain(expected);
    });

    it('should set strict ssl to false when the registry url has an http scheme', () => {
      const registryToken = '<token>';
      // eslint-disable-next-line unicorn/prefer-https -- Test behavior with no ssl
      const registryUrl = new URL('http://registry.npmjs.org');
      const actual = filesService.createNpmrc({ registryUrl, registryToken }).split('\n');
      const expected = 'strict-ssl=false';
      expect(actual).toContain(expected);
    });
  });
});
