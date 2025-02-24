import { run } from './core/run.js';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec } from '@actions/exec';
import { GitService } from './services/GitService.js';
import { FilesService } from './services/FilesService.js';
import { PackageRegistryService } from './services/PackageRegistryService.js';

const logger = core;
const workflow = core;
const git = new GitService(logger);
const files = new FilesService();
const registry = new PackageRegistryService(logger, files, exec);

void run(logger, workflow, github, git, files, registry);
