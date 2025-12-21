import path from 'node:path';
import { type exec as ActionsExec } from '@actions/exec';
import semver from 'semver';
import {
  PackageJsonSchema,
  RegistryMetadataForVersion,
  registryMetadataForVersionSchema,
  registryMetadataSchema,
} from '../types/schemas.js';
import { FilesService } from './FilesService.js';
import { Logger } from 'src/types/Logger.js';
import { PackageRegistry } from 'src/types/PackageRegistry.js';

const NOT_FOUND = 404;

export class PackageRegistryService implements PackageRegistry {
  constructor(
    private readonly logger: Logger,
    private readonly files: Pick<FilesService, 'readPackageJson'>,
    private readonly exec: typeof ActionsExec,
  ) {}

  async publishPackage(
    scriptsPackagePath: string,
    packagePath: string,
    packageJson: PackageJsonSchema,
    isPrivate: boolean,
    dryRunIsEnabled: boolean,
  ) {
    const scriptsPackageDirectory = path.dirname(scriptsPackagePath);
    const packageDirectory = path.dirname(packagePath);

    const publishScriptDidExist = !!(scriptsPackagePath === packagePath
      ? packageJson.scripts?.publish
      : this.files.readPackageJson(scriptsPackagePath).scripts?.publish);

    if (publishScriptDidExist) {
      if (dryRunIsEnabled) {
        this.logger.info(`DRY RUN: Running script 'npm run publish' from directory '${scriptsPackageDirectory}'`);
      } else {
        await this.exec('npm', ['run', 'publish'], { cwd: scriptsPackageDirectory });
      }
    } else {
      const access = isPrivate ? 'restricted' : 'public';
      const args = ['publish', `--access=${access}`];
      if (this.logger.isDebug()) {
        args.push('--verbose');
      }

      if (dryRunIsEnabled) {
        this.logger.info(`DRY RUN: Running script 'npm ${args.join(' ')}' from directory '${packageDirectory}'`);
      } else {
        await this.exec('npm', args, { cwd: packageDirectory });
      }
    }
  }

  /**
   * @param registryUrl
   * @param packageName
   * @param registryToken
   * @throws {Error} if the registry response is not a 2xx or 404 code
   * @throws {Error} if the registry response does not match the expected schema
   * @returns The package details or undefined if the registry response is a 404 (Not Found) or the latest version
   * details are not present in the response
   */
  async getPackageDetails(
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ): Promise<{ latest?: RegistryMetadataForVersion; existingVersions: Set<string> }> {
    const url = new URL(encodeURIComponent(packageName), registryUrl);
    const headers: Record<string, string> = {};
    if (registryToken) {
      headers.Authorization = `Bearer ${registryToken}`;
    }

    this.logger.debug(`Attempting to retrieve package details from registry endpoint using url "${url.toString()}"`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === NOT_FOUND) {
        return { existingVersions: new Set() };
      }
      throw new Error(
        `Fetch request failed using url "${url.toString()}". Error: ${response.status} "${response.statusText}".`,
      );
    }

    const data = registryMetadataSchema.parse(await response.json());

    const existingVersions = new Set(
      Object.keys(data.time)
        .map((x) => semver.parse(x)?.version)
        .filter(Boolean),
    );
    return {
      latest: data['dist-tags']?.latest ? data.versions?.[data['dist-tags'].latest] : undefined,
      existingVersions,
    };
  }

  private async useLatestEndpoint(
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ): Promise<RegistryMetadataForVersion | undefined> {
    try {
      const url = new URL(`${encodeURIComponent(packageName)}/latest`, registryUrl);
      this.logger.debug(`Attempting to retrieve package details from "/latest" endpoint using url "${url.toString()}"`);
      const headers: Record<string, string> = {};
      if (registryToken) {
        headers.Authorization = `Bearer ${registryToken}`;
      }
      const response = await fetch(url, { headers });

      if (response.ok) {
        return registryMetadataForVersionSchema.parse(await response.json());
      }
    } catch {
      return undefined;
    }
  }
}
