import { task, src, dest } from 'gulp';
import { getDirs } from '../util/task-helpers';
import { samplePath, integrationPath } from '../config';
import { join } from 'path';

/**
 * Moves the compiled nest files into the
 * `samples/*` and `integration/*` dirs.
 */
function move() {
  const samplesDirs = getDirs(samplePath);
  const integrationDirs = getDirs(integrationPath);
  const directories = samplesDirs.concat(integrationDirs);

  const distFiles = src(['node_modules/@nestjs/**/*']);

  return directories.reduce(
    (distFile, dir) => distFile.pipe(dest(join(dir, '/node_modules/@nestjs'))),
    distFiles,
  );
}

task('move', move);
