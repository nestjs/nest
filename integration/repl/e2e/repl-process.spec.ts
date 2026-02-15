import { spawn } from 'child_process';

const PROMPT = '> ';

describe('REPL process', () => {
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

  beforeEach(async () => {
    replProcess = spawn(
      process.execPath,
      ['--import', 'jiti/register', '../src/repl.ts'],
      {
        cwd: import.meta.dirname,
      },
    );
    await waitForReplToStart(replProcess, PROMPT);
  }, 15000);

  afterEach(() => {
    if (replProcess) {
      replProcess.kill(9);
    }
  });

  it('exits on .exit', async () => {
    return new Promise((resolve, reject) => {
      replProcess.on('exit', _ => {
        expect(replProcess.exitCode).toBe(0);
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
  }, 5000);
});
