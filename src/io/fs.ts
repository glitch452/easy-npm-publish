import fs from 'fs';
import chardet from 'chardet';
import { PackageJsonSchema, packageJsonSchema } from './schemas.js';

export function readPackageJson(filePath: string) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = fs.readFileSync(filePath);
  const encoding = chardet.detect(raw);
  const contents = new TextDecoder(encoding ?? undefined).decode(raw);
  return packageJsonSchema.parse(JSON.parse(contents));
}

export function writePackageJson(filePath: string, contents: PackageJsonSchema) {
  const indent = 2;
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(filePath, JSON.stringify(contents, undefined, indent));
}

export function writeNpmrc(filePath: string, contents: string) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  fs.writeFileSync(filePath, contents, { mode: '0600' });
}
