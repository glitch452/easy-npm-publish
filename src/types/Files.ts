import type { PackageJsonSchema } from './schemas.js';

export interface NpmrcDetails {
  registryUrl: URL;
  registryToken: string;
}

export interface Files {
  readPackageJson: (filePath: string) => PackageJsonSchema;
  writePackageJson: (filePath: string, contents: PackageJsonSchema) => void;
  writeNpmrc: (filePath: string, contents: string) => void;
  createNpmrc: ({ registryToken, registryUrl }: NpmrcDetails) => string;
}
