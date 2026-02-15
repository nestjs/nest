import { blue, magenta } from 'ansis';
import log from 'fancy-log';
import { task } from 'gulp';
import * as childProcess from 'node:child_process';
import { execFile as execFileCb } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { samplePath } from '../config.js';
import { containsPackageJson, getDirs } from '../util/task-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exec = promisify(childProcess.exec);
const execFile = promisify(execFileCb);

async function executeNpmScriptInSamples(
  script: string,
  appendScript?: string,
) {
  const nodejsVersionMajorSlice = Number.parseInt(process.versions.node);

  const directories = getDirs(samplePath);

  // TODO: temporarily ignore Prisma sample as require('.')
  // leads to Module '"@prisma/client"' has no exported member 'Post' error
  const prismaSampleIndex = directories.indexOf(
    `${samplePath}/22-graphql-prisma`,
  );
  if (prismaSampleIndex !== -1) {
    directories.splice(prismaSampleIndex, 1);
  }

  // TODO: samples that use third-party compiler plugins (e.g. @nestjs/swagger,
  // @nestjs/graphql) are excluded because move:samples copies local ESM builds
  // into node_modules, but these CJS plugins load framework packages via require().
  const samplesWithCompilerPlugins = [
    '11-swagger',
    '23-graphql-code-first',
    '33-graphql-mercurius',
  ];
  for (const sample of samplesWithCompilerPlugins) {
    const idx = directories.indexOf(`${samplePath}/${sample}`);
    if (idx !== -1) {
      directories.splice(idx, 1);
    }
  }

  // A dictionary that maps the sample number to the minimum Node.js version
  // required to execute any scripts.
  const minNodejsVersionBySampleNumber = {
    '34': 18, // we could use `engines.node` from package.json instead of hardcoding
    '35': 22,
  };

  for await (const dir of directories) {
    const sampleIdentifier = dir.match(/\d+/)?.[0];
    const minNodejsVersionForDir =
      sampleIdentifier && sampleIdentifier in minNodejsVersionBySampleNumber
        ? minNodejsVersionBySampleNumber[sampleIdentifier]
        : undefined;
    const isOnDesiredMinNodejsVersion = minNodejsVersionForDir
      ? nodejsVersionMajorSlice >= minNodejsVersionForDir
      : true;
    if (!isOnDesiredMinNodejsVersion) {
      console.info(
        `Skipping sample ${sampleIdentifier} because it requires Node.js version v${minNodejsVersionForDir}`,
      );
      continue;
    }

    // Check if the sample is a multi-application sample
    const isSingleApplicationSample = containsPackageJson(dir);
    if (!isSingleApplicationSample) {
      // Application is a multi-application sample
      // Go down into the sub-directories
      const subDirs = getDirs(dir);
      for (const subDir of subDirs) {
        await executeNPMScriptInDirectory(subDir, script, appendScript);
      }
    } else {
      await executeNPMScriptInDirectory(dir, script, appendScript);
    }
  }
}

/**
 * Executes the provided NPM script in the specified directory
 * @param dir directory of the application
 * @param script script to execute
 * @param appendScript additional params appended to the script
 */
async function executeNPMScriptInDirectory(
  dir: string,
  script: string,
  appendScript?: string,
) {
  const dirName = dir.replace(resolve(__dirname, '../../../'), '');
  log.info(`Running ${blue(script)} in ${magenta(dirName)}`);
  try {
    // Split the script into command and arguments
    const scriptParts = script.split(' ').filter(Boolean);
    const command = scriptParts[0];
    const args = scriptParts.slice(1);
    // Add --prefix and dir
    args.push('--prefix', dir);
    // If appendScript is provided, split and append
    if (appendScript) {
      args.push('--', ...appendScript.split(' ').filter(Boolean));
    }
    const result = await execFile(command, args);

    log.info(`Finished running ${blue(script)} in ${magenta(dirName)}`);
    if (result.stderr) {
      log.error(result.stderr);
    }
    if (result.stdout) {
      log.error(result.stdout);
    }
  } catch (err) {
    log.error(`Failed running ${blue(script)} in ${magenta(dirName)}`);
    if (err.stderr) {
      log.error(err.stderr);
    }
    if (err.stdout) {
      log.error(err.stdout);
    }
    process.exit(1);
  }
}

task('install:samples', async () =>
  executeNpmScriptInSamples(
    // 'npm ci --no-audit --no-shrinkwrap --no-optional',
    'npm install --legacy-peer-deps',
  ),
);
task('build:samples', async () => executeNpmScriptInSamples('npm run build'));
task('test:samples', async () =>
  executeNpmScriptInSamples('npm run test', '--passWithNoTests'),
);
task('test:e2e:samples', async () =>
  executeNpmScriptInSamples('npm run test:e2e', '--passWithNoTests'),
);
