import { task, src, dest } from 'gulp';
import { packagePaths } from '../config';

/**
 * Copies assets like Readme.md or LICENSE from the project base path
 * to all the packages.
 */
function copyMisc(): NodeJS.ReadWriteStream {
  const miscFiles = src(['Readme.md', 'LICENSE', '.npmignore']);
  // Since `dest()` does not take a string-array, we have to append it
  // ourselves
  return packagePaths.reduce(
    (stream, packagePath) => stream.pipe(dest(packagePath)),
    miscFiles,
  );
}

task('copy-misc', copyMisc);
