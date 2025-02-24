import type { PackageJsonSchema, RegistryMetadataForVersion } from './schemas.js';

export interface PackageRegistry {
  getLatestPackageDetails: (
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ) => Promise<RegistryMetadataForVersion | undefined>;
  publishPackage: (
    scriptsPackagePath: string,
    packagePath: string,
    packageJson: PackageJsonSchema,
    isPrivate: boolean,
    dryRun: boolean,
  ) => Promise<void>;
}
