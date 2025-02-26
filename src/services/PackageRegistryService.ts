import path from 'node:path';
import { ExecOptions } from '@actions/exec';
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
    private readonly exec: (commandLine: string, args?: string[], options?: ExecOptions) => Promise<number>,
  ) {}

  async publishPackage(
    scriptsPackagePath: string,
    packagePath: string,
    packageJson: PackageJsonSchema,
    isPrivate: boolean,
    dryRun: boolean,
  ) {
    const scriptsPackageDirectory = path.dirname(scriptsPackagePath);
    const packageDirectory = path.dirname(packagePath);

    const publishScriptExists = !!(scriptsPackagePath === packagePath
      ? packageJson.scripts?.publish
      : this.files.readPackageJson(scriptsPackagePath).scripts?.publish);

    if (publishScriptExists) {
      if (dryRun) {
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

      if (dryRun) {
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
  async getLatestPackageDetails(
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ): Promise<RegistryMetadataForVersion | undefined> {
    // Attempt to get the package details from the `/latest` endpoint, which works on NPM but may not be
    // available on other registries, such as GitHub packages; otherwise, fall back to the full package details
    const dataFromLatest = await this.useLatestEndpoint(registryUrl, packageName, registryToken);
    if (dataFromLatest) {
      this.logger.debug('Registry details successfully retrieved from "/latest" endpoint');
      return dataFromLatest;
    }

    const url = new URL(encodeURIComponent(packageName), registryUrl);
    const headers: Record<string, string> = {};
    if (registryToken) {
      headers.Authorization = `Bearer ${registryToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === NOT_FOUND) {
        return;
      }
      throw new Error(
        `Fetch request failed using url "${url.toString()}". Error: ${response.status} "${response.statusText}".`,
      );
    }

    const data = registryMetadataSchema.parse(await response.json());
    return data.versions[data['dist-tags'].latest];
  }

  private async useLatestEndpoint(
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ): Promise<RegistryMetadataForVersion | undefined> {
    try {
      const url = new URL(`${encodeURIComponent(packageName)}/latest`, registryUrl);
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
