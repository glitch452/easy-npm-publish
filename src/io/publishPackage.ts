import path from 'path';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { PackageJsonSchema } from './schemas.js';
import { readPackageJson } from './fs.js';

export async function publishPackage(
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
    : readPackageJson(scriptsPackagePath).scripts?.publish);

  if (publishScriptExists) {
    if (dryRun) {
      core.info(`DRY RUN: Running script 'npm run publish' from directory '${scriptsPackageDirectory}'`);
    } else {
      await exec('npm', ['run', 'publish'], { cwd: scriptsPackageDirectory });
    }
  } else {
    const access = isPrivate ? 'restricted' : 'public';
    const args = ['publish', `--access=${access}`];
    if (core.isDebug()) {
      args.push('--verbose');
    }

    if (dryRun) {
      core.info(`DRY RUN: Running script 'npm ${args.join(' ')}' from directory '${packageDirectory}'`);
    } else {
      await exec('npm', args, { cwd: packageDirectory });
    }
  }
}
