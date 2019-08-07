'use strict';
/**
 * Load the TypeScript compiler, then load the TypeScript gulpfile which simply loads all
 * the tasks. The tasks are really inside tools/gulp/tasks.
 */

const path = require('path');

const projectDir = __dirname;
const tsconfigPath = path.join(projectDir, 'tools/gulp/tsconfig.json');

require('ts-node').register({
  project: tsconfigPath
});

require('./tools/gulp/gulpfile');