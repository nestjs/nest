#!/usr/bin/env node

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const packOnly = args.has('--pack-only');
const installOnly = args.has('--install-only');

const sampleDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(sampleDir, '..', '..');
const trpcPackageDir = path.join(repoRoot, 'packages', 'trpc');
const trpcPackageJsonPath = path.join(trpcPackageDir, 'package.json');
const localDir = path.join(sampleDir, '.local');

if (!fs.existsSync(trpcPackageJsonPath)) {
  throw new Error(
    `Unable to locate @nestjs/trpc package at ${trpcPackageJsonPath}`,
  );
}

const trpcPackage = JSON.parse(fs.readFileSync(trpcPackageJsonPath, 'utf8'));
const tarballName = `nestjs-trpc-${trpcPackage.version}.tgz`;
const tarballPath = path.join(localDir, tarballName);
const npmCacheDir = path.join(localDir, 'npm-cache');

fs.mkdirSync(localDir, { recursive: true });
fs.mkdirSync(npmCacheDir, { recursive: true });

const npmEnv = {
  ...process.env,
  npm_config_cache: npmCacheDir,
};

function run(command, commandArgs, options = {}) {
  execFileSync(command, commandArgs, {
    stdio: 'inherit',
    ...options,
  });
}

if (!installOnly) {
  for (const file of fs.readdirSync(localDir)) {
    if (file.startsWith('nestjs-trpc-') && file.endsWith('.tgz')) {
      fs.rmSync(path.join(localDir, file), { force: true });
    }
  }

  run('npm', ['pack', trpcPackageDir, '--pack-destination', localDir], {
    cwd: repoRoot,
    env: npmEnv,
  });
}

if (!packOnly) {
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Expected tarball not found at ${tarballPath}`);
  }

  run('npm', ['install', '--legacy-peer-deps', '--no-save', tarballPath], {
    cwd: sampleDir,
    env: npmEnv,
  });
}
