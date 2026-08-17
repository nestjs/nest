import { spawnSync } from 'child_process';
import { join } from 'path';

const nodeCmd = process.execPath;

function spawnTsNode(...args: string[]) {
  return spawnSync(nodeCmd, ['--import', 'jiti/register', ...args]);
}

describe('enableShutdownHooks', () => {
  it('should call the correct hooks if any shutdown signal gets invoked', () =>
    new Promise<void>(done => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGHUP',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).toBe('onApplicationShutdown SIGHUP');
      done();
    }));

  it('should call the correct hooks if a specific shutdown signal gets invoked', () =>
    new Promise<void>(done => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'SIGINT',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGINT');
      expect(calls[1]).toBe('onApplicationShutdown SIGINT');
      done();
    }));

  it('should ignore system signals which are not specified', () =>
    new Promise<void>(done => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'SIGHUP',
      );
      expect(result.stdout.toString().trim()).toBe('');
      done();
    }));

  it('should ignore system signals if "enableShutdownHooks" was not called', () =>
    new Promise<void>(done => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'NONE',
      );
      expect(result.stdout.toString().trim()).toBe('');
      done();
    }));

  it('should call the correct hooks with useProcessExit option', () =>
    new Promise<void>(done => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGHUP',
        'SIGHUP',
        'graceful',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).toBe('onApplicationShutdown SIGHUP');
      expect(result.status).toBe(0);
      done();
    }));
});
