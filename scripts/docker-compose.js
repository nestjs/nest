'use strict';

/**
 * Cross-platform wrapper that forwards arguments to whichever Docker Compose
 * implementation is available on the host:
 *
 *   1. `docker compose` (Compose V2 plugin, shipped with modern Docker Desktop)
 *   2. `docker-compose`  (legacy standalone V1 binary)
 *
 * This exists because contributors run a mix of both and neither is guaranteed
 * to be installed. The wrapper prefers V2 when available and transparently
 * falls back to V1, so npm scripts like `test:docker:up` work everywhere.
 */

const { spawnSync } = require('node:child_process');

const forwardedArgs = process.argv.slice(2);
const isWindows = process.platform === 'win32';

function hasComposeV2() {
  const result = spawnSync('docker', ['compose', 'version'], {
    stdio: 'ignore',
    shell: isWindows,
  });
  return result.status === 0;
}

function hasComposeV1() {
  const probe = isWindows ? 'where' : 'which';
  const result = spawnSync(probe, ['docker-compose'], {
    stdio: 'ignore',
    shell: isWindows,
  });
  return result.status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
  });
  if (result.error) {
    console.error(
      `[docker-compose] Failed to execute: ${result.error.message}`,
    );
    process.exit(1);
  }
  process.exit(result.status == null ? 1 : result.status);
}

if (hasComposeV2()) {
  run('docker', ['compose', ...forwardedArgs]);
} else if (hasComposeV1()) {
  run('docker-compose', forwardedArgs);
} else {
  console.error(
    "[docker-compose] Neither 'docker compose' (V2) nor 'docker-compose' (V1) was found on PATH.\n" +
      'Install Docker Desktop or the Docker Compose plugin and try again.',
  );
  process.exit(1);
}
