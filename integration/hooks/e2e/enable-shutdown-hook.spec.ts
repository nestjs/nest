import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { join } from 'path';

describe('enableShutdownHooks', () => {
  it('should call the correct hooks if any shutdown signal gets invoked', done => {
    const result = spawnSync('ts-node', [
      join(__dirname, '../src/enable-shutdown-hooks-main.ts'),
      'SIGHUP',
    ]);
    const calls = result.stdout
      .toString()
      .split('\n')
      .map((call: string) => call.trim());
    expect(calls[0]).to.equal('beforeApplicationShutdown SIGHUP');
    expect(calls[1]).to.equal('onApplicationShutdown SIGHUP');
    done();
  }).timeout(10000);

  it('should call the correct hooks if a specific shutdown signal gets invoked', done => {
    const result = spawnSync('ts-node', [
      join(__dirname, '../src/enable-shutdown-hooks-main.ts'),
      'SIGINT',
      'SIGINT',
    ]);
    const calls = result.stdout
      .toString()
      .split('\n')
      .map((call: string) => call.trim());
    expect(calls[0]).to.equal('beforeApplicationShutdown SIGINT');
    expect(calls[1]).to.equal('onApplicationShutdown SIGINT');
    done();
  }).timeout(10000);

  it('should ignore system signals which are not specified', done => {
    const result = spawnSync('ts-node', [
      join(__dirname, '../src/enable-shutdown-hooks-main.ts'),
      'SIGINT',
      'SIGHUP',
    ]);
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  }).timeout(10000);

  it('should ignore system signals if "enableShutdownHooks" was not called', done => {
    const result = spawnSync('ts-node', [
      join(__dirname, '../src/enable-shutdown-hooks-main.ts'),
      'SIGINT',
      'NONE',
    ]);
    expect(result.stdout.toString().trim()).to.be.eq('');
    done();
  }).timeout(10000);
});
