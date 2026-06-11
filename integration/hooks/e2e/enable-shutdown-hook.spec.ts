import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join } from 'path';

describe('enableShutdownHooks', () => {
  const workspaceRoot = join(__dirname, '../../..');
  const localPackageResolver = join(
    workspaceRoot,
    'integration/_support/register-local-packages.ts',
  );
  const entrypoint = join(__dirname, '../src/enable-shutdown-hooks-main.ts');

  const runScript = (...args: string[]) =>
    spawnSync(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        '-r',
        localPackageResolver,
        entrypoint,
        ...args,
      ],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          TS_NODE_PROJECT: join(
            workspaceRoot,
            'integration/hooks/tsconfig.json',
          ),
        },
      },
    );

  it('should call the correct hooks if any shutdown signal gets invoked', done => {
    const result = runScript('SIGHUP');
    const calls = result.stdout
      .toString()
      .split('\n')
      .map((call: string) => call.trim());
    expect(calls[0]).to.equal('beforeApplicationShutdown SIGHUP');
    expect(calls[1]).to.equal('onApplicationShutdown SIGHUP');
    done();
  }).timeout(10000);

  it('should call the correct hooks if a specific shutdown signal gets invoked', done => {
    const result = runScript('SIGINT', 'SIGINT');
    const calls = result.stdout
      .toString()
      .split('\n')
      .map((call: string) => call.trim());
    expect(calls[0]).to.equal('beforeApplicationShutdown SIGINT');
    expect(calls[1]).to.equal('onApplicationShutdown SIGINT');
    done();
  }).timeout(10000);

  it('should ignore system signals which are not specified', done => {
    const result = runScript('SIGINT', 'SIGHUP');
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  }).timeout(10000);

  it('should ignore system signals if "enableShutdownHooks" was not called', done => {
    const result = runScript('SIGINT', 'NONE');
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  }).timeout(10000);

  it('should call the correct hooks with useProcessExit option', done => {
    const result = runScript('SIGHUP', 'SIGHUP', 'graceful');
    const calls = result.stdout
      .toString()
      .split('\n')
      .map((call: string) => call.trim());
    expect(calls[0]).to.equal('beforeApplicationShutdown SIGHUP');
    expect(calls[1]).to.equal('onApplicationShutdown SIGHUP');
    expect(result.status).to.equal(0);
    done();
  }).timeout(10000);
});
