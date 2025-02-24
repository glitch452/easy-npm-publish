import fs from 'node:fs';
import chardet from 'chardet';
import { PackageJsonSchema, packageJsonSchema } from '../types/schemas.js';
import { Files, NpmrcDetails } from 'src/types/Files.js';

export type NodeFileSystem = Pick<typeof fs, 'writeFileSync' | 'readFileSync'>;

export class FilesService implements Files {
  constructor(private readonly fileSystem: NodeFileSystem = fs) {}

  readPackageJson(filePath: string) {
    const raw = this.fileSystem.readFileSync(filePath);
    const encoding = chardet.detect(raw) ?? undefined;
    const contents = new TextDecoder(encoding).decode(raw);
    return packageJsonSchema.parse(JSON.parse(contents));
  }

  writePackageJson(filePath: string, contents: PackageJsonSchema) {
    const indent = 2;
    this.fileSystem.writeFileSync(filePath, JSON.stringify(contents, undefined, indent));
  }

  writeNpmrc(filePath: string, contents: string) {
    this.fileSystem.writeFileSync(filePath, contents, { mode: '0600' });
  }

  createNpmrc({ registryToken, registryUrl }: NpmrcDetails) {
    return [
      `//${registryUrl.host}/:_authToken=${registryToken}`,
      `registry=${registryUrl.href}`,
      `strict-ssl=${registryUrl.protocol.startsWith('https')}`,
    ].join('\n');
  }
}
