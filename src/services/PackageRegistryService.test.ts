import { fs, vol } from 'memfs';
import { HttpResponse, http } from 'msw';
import { server } from '../../vitest.setup.js';
import { FilesService } from './FilesService.js';
import { PackageRegistryService } from './PackageRegistryService.js';
import { getLoggerMock } from '__mocks__/getLoggerMock.js';
import { PackageJsonSchema } from 'src/types/schemas.js';

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
      expect(execMock).not.toBeCalled();
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
        expect(execMock).not.toBeCalled();
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
        expect(execMock).not.toBeCalled();
      });
    });
  });

  describe(PackageRegistryService.prototype.getLatestPackageDetails.name, () => {
    const url = new URL('https://myregistry.test');
    const packageName = '<packageName>';
    const registryToken = '<registryToken>';
    const registryMeta = { name: '<name>', version: '<version>', gitHead: '<gitHead>' };
    const packageEndpoint = `${url.toString()}${encodeURIComponent(packageName)}`;
    const latestEndpoint = `${packageEndpoint}/latest`;
    let authHeader: string | undefined;

    afterEach(() => {
      server.resetHandlers();
    });

    describe('Using the "/latest" endpoint', () => {
      beforeEach(() => {
        server.use(http.get(latestEndpoint, () => HttpResponse.json(registryMeta)));
      });

      it('should return the package details found at the "/latest" endpoint if it is available', async () => {
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        const expected = registryMeta;
        expect(actual).toStrictEqual(expected);
      });
    });

    describe('Using the package endpoint', () => {
      beforeEach(() => {
        server.use(
          http.get(packageEndpoint, () =>
            HttpResponse.json({ 'dist-tags': { latest: '0.0.0' }, versions: { '0.0.0': registryMeta }, time: {} }),
          ),
        );
      });

      it('should return the latest details found at the package endpoint when the "/latest" endpoint returns a 404 status code', async () => {
        server.use(http.get(latestEndpoint, () => new HttpResponse(undefined, { status: 404 })));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should return the latest details found at the package endpoint when the "/latest" endpoint returns a 500 status code', async () => {
        server.use(http.get(latestEndpoint, () => new HttpResponse(undefined, { status: 500 })));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should get the data from the package endpoint when the "/latest" endpoint returns non-json data', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.text('I am not JSON')));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should get the data from the package endpoint when the "/latest" endpoint returns invalid data', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.json({ ...registryMeta, name: false })));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should get the data from the package endpoint when the "/latest" endpoint has a network error', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toStrictEqual(registryMeta);
      });

      it('should return undefined when the "/latest" endpoint fails and the package endpoint returns a 404 status code', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(http.get(packageEndpoint, () => new HttpResponse(undefined, { status: 404 })));
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toBeUndefined();
      });

      it('should throw when the "/latest" endpoint fails and the package endpoint returns a 500 status code', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(http.get(packageEndpoint, () => new HttpResponse(undefined, { status: 500 })));
        const actual = registryService.getLatestPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow('Fetch request failed');
      });

      it('should throw when the "/latest" endpoint fails and the package endpoint throws due to a network error', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(http.get(packageEndpoint, () => HttpResponse.error()));
        const actual = registryService.getLatestPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should throw when the "/latest" endpoint fails and the package endpoint returns non-json data', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(http.get(packageEndpoint, () => HttpResponse.text('I am not JSON')));
        const actual = registryService.getLatestPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should throw when the "/latest" endpoint fails and the package endpoint returns invalid data', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(http.get(packageEndpoint, () => HttpResponse.json({ 'dist-tags': false })));
        const actual = registryService.getLatestPackageDetails(url, packageName);
        await expect(actual).rejects.toThrow();
      });

      it('should return undefined when the "/latest" endpoint fails and the package endpoint returns a payload with a latest version that is not in the versions map', async () => {
        server.use(http.get(latestEndpoint, () => HttpResponse.error()));
        server.use(
          http.get(packageEndpoint, () =>
            HttpResponse.json({ 'dist-tags': { latest: '0.0.0' }, versions: {}, time: {} }),
          ),
        );
        const actual = await registryService.getLatestPackageDetails(url, packageName);
        expect(actual).toBeUndefined();
      });
    });

    describe('Registry Token with the package endpoint', () => {
      beforeEach(() => {
        server.use(
          http.get(latestEndpoint, () => HttpResponse.error()),
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
        await registryService.getLatestPackageDetails(url, packageName, registryToken);
        const expected = `Bearer ${registryToken}`;
        expect(authHeader).toStrictEqual(expected);
      });

      it('should not include the bearer token in the request if the registryToken is not provided', async () => {
        authHeader = '';
        await registryService.getLatestPackageDetails(url, packageName);
        expect(authHeader).toBeUndefined();
      });
    });

    describe('Registry Token with the "/latest" endpoint', () => {
      beforeEach(() => {
        server.use(
          http.get(latestEndpoint, ({ request }) => {
            authHeader = request.headers.get('Authorization') ?? undefined;
            return HttpResponse.json(registryMeta);
          }),
        );
      });

      it('should include the bearer token in the request if the registryToken is provided', async () => {
        authHeader = undefined;
        await registryService.getLatestPackageDetails(url, packageName, registryToken);
        const expected = `Bearer ${registryToken}`;
        expect(authHeader).toStrictEqual(expected);
      });

      it('should not include the bearer token in the request if the registryToken is not provided', async () => {
        authHeader = '';
        await registryService.getLatestPackageDetails(url, packageName);
        expect(authHeader).toBeUndefined();
      });
    });
  });
});
