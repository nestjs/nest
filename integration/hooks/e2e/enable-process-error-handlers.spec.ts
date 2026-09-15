import { spawnSync } from 'child_process';
import { join } from 'path';

const nodeCmd = process.execPath;

function spawnTsNode(...args: string[]) {
  return spawnSync(nodeCmd, ['--import', 'jiti/register', ...args]);
}

function lines(result: ReturnType<typeof spawnTsNode>) {
  return result.stdout
    .toString()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

describe('enableProcessErrorHandlers', () => {
  it('should run the shutdown sequence and exit with the given code on uncaughtException', () => {
    const result = spawnTsNode(
      join(import.meta.dirname, '../src/enable-process-error-handlers-main.ts'),
      'uncaughtException',
      'shutdown',
      '7',
    );
    const output = lines(result);

    expect(output).toEqual([
      'handler uncaughtException boom',
      'beforeApplicationShutdown uncaughtException',
      'onApplicationShutdown uncaughtException',
    ]);
    expect(result.status).toBe(7);
  });

  it('should run the shutdown sequence and exit with the given code on unhandledRejection', () => {
    const result = spawnTsNode(
      join(import.meta.dirname, '../src/enable-process-error-handlers-main.ts'),
      'unhandledRejection',
      'shutdown',
      '9',
    );
    const output = lines(result);

    expect(output).toEqual([
      'handler unhandledRejection boom',
      'beforeApplicationShutdown unhandledRejection',
      'onApplicationShutdown unhandledRejection',
    ]);
    expect(result.status).toBe(9);
  });

  it('should keep the process alive when the handler does not shut down', () => {
    const result = spawnTsNode(
      join(import.meta.dirname, '../src/enable-process-error-handlers-main.ts'),
      'uncaughtException',
      'log',
    );
    const output = lines(result);

    expect(output).toEqual(['handler uncaughtException boom', 'still alive']);
    expect(result.status).toBe(0);
  });
});
