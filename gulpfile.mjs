/**
 * Load the TypeScript compiler, then load the TypeScript gulpfile which simply loads all
 * the tasks. The tasks are really inside tools/gulp/tasks.
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('ts-node/esm', pathToFileURL('./'), {
  data: { project: './tools/gulp/tsconfig.json' },
});

await import('./tools/gulp/gulpfile.ts');
