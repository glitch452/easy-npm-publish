import type { PackageJsonSchema, RegistryMetadataForVersion } from './schemas.js';

export interface PackageRegistry {
  getPackageDetails: (
    registryUrl: URL,
    packageName: string,
    registryToken?: string,
  ) => Promise<{ latest?: RegistryMetadataForVersion; existingVersions: Set<string> }>;
  publishPackage: (
    scriptsPackagePath: string,
    packagePath: string,
    packageJson: PackageJsonSchema,
    isPrivate: boolean,
    dryRun: boolean,
  ) => Promise<void>;
}
