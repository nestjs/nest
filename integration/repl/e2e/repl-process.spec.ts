import { expect } from 'chai';
import { spawn } from 'child_process';
import { join } from 'path';

const PROMPT = '> ';
const workspaceRoot = join(__dirname, '../../..');
const localPackageResolver = join(
  workspaceRoot,
  'integration/_support/register-local-packages.ts',
);
const replEntrypoint = join(__dirname, '../src/repl.ts');

describe('REPL process', function () {
  let replProcess: ReturnType<typeof spawn>;

  function waitForReplToStart(
    process: ReturnType<typeof spawn>,
    message,
    timeout = 10000,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('REPL did not start in time'));
      }, timeout);

      if (!process.stdout || !process.stderr) {
        return reject(new Error('REPL stdout or stderr is not available'));
      }
      process.stdout.on('data', data => {
        if (data.toString().includes(message)) {
          clearTimeout(timer);
          resolve();
        }
      });

      process.stderr.on('data', data => {
        if (data.toString().includes(message)) {
          clearTimeout(timer);
          reject(new Error(`REPL started with error: ${data}`));
        }
      });
    });
  }

  beforeEach(async function () {
    this.timeout(15000);
    replProcess = spawn(
      process.execPath,
      [
        '-r',
        'ts-node/register/transpile-only',
        '-r',
        localPackageResolver,
        replEntrypoint,
      ],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          TS_NODE_PROJECT: join(
            workspaceRoot,
            'integration/repl/tsconfig.json',
          ),
        },
      },
    );
    await waitForReplToStart(replProcess, PROMPT);
  });

  afterEach(function () {
    if (replProcess) {
      replProcess.kill(9);
    }
  });

  it('exits on .exit', async function () {
    this.timeout(1000);

    return new Promise((resolve, reject) => {
      replProcess.on('exit', _ => {
        expect(replProcess.exitCode).to.equal(0);
        resolve();
      });

      replProcess.on('error', err => {
        reject(err);
      });

      if (replProcess.stdin) {
        replProcess.stdin.write('.exit\n');
      } else {
        reject(new Error('REPL stdin is not available'));
      }
    });
  });
});
