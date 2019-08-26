import { resolve } from 'path';
import { promisify } from 'util';
import * as childProcess from 'child_process';

import { task } from 'gulp';

import * as log from 'fancy-log';
import * as clc from 'cli-color';

import { getDirs } from '../util/task-helpers';
import { samplePath } from '../config';

const exec = promisify(childProcess.exec);

/**
 * Installs all the npm packages in the
 * `samples/*` folder
 */
async function installSamples() {
  const directories = getDirs(samplePath);

  for await (const dir of directories) {
    const dirName = dir.replace(resolve(__dirname, '../../../'), '');
    log.info(`Installing dependencies of ${clc.magenta(dirName)}`);
    try {
      await exec(`npm install --no-shrinkwrap --prefix ${dir}`);
      log.info(`Finished installing ${clc.magenta(dirName)}`);
    } catch (err) {
      log.error(`Failed installing dependencies of ${dirName}`);
      throw err;
    }
  }
}

/**
 * Builds all the `samples/*`
 */
async function buildSamples() {
  const directories = getDirs(samplePath);

  for await (const dir of directories) {
    const dirName = dir.replace(__dirname, '');
    log.info(`Building ${clc.magenta(dirName)}`);
    try {
      await exec(`npm run build --prefix ${dir}`);
      log.info(`Finished building ${clc.magenta(dirName)}`);
    } catch (err) {
      log.error(`Failed building ${clc.magenta(dirName)}:`);
      if (err.stdout) {
        log.error(err.stdout);
      }
      process.exit(1);
    }
  }
}

task('install:samples', async () => await installSamples());
task('build:samples', async () => await buildSamples());
