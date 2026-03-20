import { fs, vol } from 'memfs';
import { HttpResponse, http } from 'msw';
import { server } from '../../vitest.setup.js';
import { getLoggerMock } from '../mocks/getLoggerMock.js';
import { PackageJsonSchema } from '../types/schemas.js';
import { FilesService } from './FilesService.js';
import { PackageRegistryService } from './PackageRegistryService.js';

vi.mock('node:fs');

describe(PackageRegistryService.name, () => {
  const loggerMock = getLoggerMock();
  const execMock = vi.fn();
  const filesService = new FilesService();
  const registryService = new PackageRegistryService(loggerMock, filesService, execMock);

  afterEach(() => {
    vi.clearAllMocks();
    vol.reset();
  });

  describe(PackageRegistryService.prototype.publishPackage.name, () => {
    let scriptsPackagePath: string;
    let packagePath: string;
    let packageJson: PackageJsonSchema;
    let isPrivate: boolean;
    let dryRun: boolean;

    beforeEach(() => {
      scriptsPackagePath = '/package.json';
      packagePath = '/package.json';
      packageJson = { name: '', version: '', scripts: {} };
      isPrivate = false;
      dryRun = false;
    });

    it('should generate and run the publish script for a public package', async () => {
      await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
      expect(execMock).toHaveBeenCalledExactlyOnceWith('npm', ['publish', '--access=public'], { cwd: '/' });
    });

    it('should generate and run the publish script for a private package', async () => {
      isPrivate = true;
      await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
      expect(execMock).toHaveBeenCalledExactlyOnceWith('npm', ['publish', '--access=restricted'], { cwd: '/' });
    });

    it('should not run the generated publish script when dryRuin is true', async () => {
      dryRun = true;
      await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
      expect(execMock).not.toHaveBeenCalled();
    });
    it('should generate and run the publish script with the "--verbose" flag when the logger isDebug() returns true', async () => {
      loggerMock.isDebug.mockReturnValue(true);
      await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
      expect(execMock).toHaveBeenCalledExactlyOnceWith('npm', ['publish', '--access=public', '--verbose'], {
        cwd: '/',
      });
    });

    describe('Using the publish script in package.json', () => {
      beforeEach(() => {
        packageJson = { name: '', version: '', scripts: { publish: '<publish>' } };
      });

      it('should run the publish script in the packageJson input when both package file paths are the same', async () => {
        await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
        expect(execMock).toHaveBeenCalledExactlyOnceWith('npm', ['run', 'publish'], { cwd: '/' });
      });

      it('should not run the publish script in the packageJson input when dryRuin is true and both package file paths are the same', async () => {
        dryRun = true;
        await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
        expect(execMock).not.toHaveBeenCalled();
      });

      it('should run the publish script in the scriptsPackagePath input when both package file paths are different', async () => {
        packagePath = '/dist/package.json';
        fs.writeFileSync(scriptsPackagePath, JSON.stringify(packageJson));
        await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
        expect(execMock).toHaveBeenCalledExactlyOnceWith('npm', ['run', 'publish'], { cwd: '/' });
      });

      it('should not run the publish script in the scriptsPackagePath input when dryRuin is true and both package file paths are different', async () => {
        packagePath = '/dist/package.json';
        dryRun = true;
        fs.writeFileSync(scriptsPackagePath, JSON.stringify(packageJson));
        await registryService.publishPackage(scriptsPackagePath, packagePath, packageJson, isPrivate, dryRun);
        expect(execMock).not.toHaveBeenCalled();
      });
    });
  });

  describe(PackageRegistryService.prototype.getPackageDetails.name, () => {
    const url = new URL('https://myregistry.test');
    const packageName = '<packageName>';
    const registryToken = '<registryToken>';
    const registryMeta = { name: '<name>', version: '<version>', gitHead: '<gitHead>' };
    const unpublishedDetails = {
      time: '2024-07-21T07:13:03.593Z',
      versions: ['0.0.1', '0.1.0', '0.2.0', '1.0.0', '2.0.0'],
    };
    const timeObject = {
      created: '2024-07-21T06:43:13.180Z',
      modified: '2025-12-20T20:38:36.378Z',
      '0.0.1': '2024-07-21T06:43:13.461Z',
      '0.1.0': '2024-07-21T06:45:42.396Z',
      '0.2.0': '2024-07-21T06:58:48.892Z',
      '1.0.0': '2024-07-21T07:00:32.254Z',
      '2.0.0': '2024-07-21T07:05:02.559Z',
      unpublished: unpublishedDetails,
    };
    const packageEndpoint = `${url.toString()}${encodeURIComponent(packageName)}`;
    let authHeader: string | undefined;

    afterEach(() => {
      server.resetHandlers();
    });

    describe('Using the package endpoint', () => {
      beforeEach(() => {
        server.use(
          http.get(packageEndpoint, () =>
            HttpResponse.json({
              'dist-tags': { latest: '0.0.0' },
              versions: { '0.0.0': registryMeta },
              time: timeObject,
            }),
          ),
        );
      });

      it('should return the latest details found at the package endpoint', async () => {
        const actual = (await registryService.getPackageDetails(url, packageName)).latest;
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should return the existing versions found at the package endpoint', async () => {
        const actual = (await registryService.getPackageDetails(url, packageName)).existingVersions;
        const expected = new Set(['0.0.1', '0.1.0', '0.2.0', '1.0.0', '2.0.0']);
        expect(actual).toStrictEqual(expected);
      });

      it('should throw when the package endpoint returns a 500 status code', async () => {
        server.use(http.get(packageEndpoint, () => new HttpResponse(undefined, { status: 500 })));
        const actual = registryService.getPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow('Fetch request failed');
      });

      it('should throw when the package endpoint throws due to a network error', async () => {
        server.use(http.get(packageEndpoint, () => HttpResponse.error()));
        const actual = registryService.getPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should throw when the package endpoint returns non-json data', async () => {
        server.use(http.get(packageEndpoint, () => HttpResponse.text('I am not JSON')));
        const actual = registryService.getPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should throw when the package endpoint returns invalid data', async () => {
        server.use(http.get(packageEndpoint, () => HttpResponse.json({ 'dist-tags': false })));
        const actual = registryService.getPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should return undefined when the package endpoint returns a payload with a latest version that is not in the versions map', async () => {
        server.use(
          http.get(packageEndpoint, () =>
            HttpResponse.json({ 'dist-tags': { latest: '0.0.0' }, versions: {}, time: {} }),
          ),
        );
        const actual = (await registryService.getPackageDetails(url, packageName)).latest;
        expect(actual).toBeUndefined();
      });
    });

    describe('Registry Token with the package endpoint', () => {
      beforeEach(() => {
        server.use(
          http.get(packageEndpoint, ({ request }) => {
            authHeader = request.headers.get('Authorization') ?? undefined;
            return HttpResponse.json({
              'dist-tags': { latest: '0.0.0' },
              versions: { '0.0.0': registryMeta },
              time: {},
            });
          }),
        );
      });

      it('should include the bearer token in the request if the registryToken is provided', async () => {
        authHeader = undefined;
        await registryService.getPackageDetails(url, packageName, registryToken);
        const expected = `Bearer ${registryToken}`;
        expect(authHeader).toStrictEqual(expected);
      });

      it('should not include the bearer token in the request if the registryToken is not provided', async () => {
        authHeader = '';
        await registryService.getPackageDetails(url, packageName);
        expect(authHeader).toBeUndefined();
      });
    });
  });
});
