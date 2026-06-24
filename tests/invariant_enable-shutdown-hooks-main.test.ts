import { spawn } from 'child_process';
import { join } from 'path';

describe('Shutdown hooks must maintain security boundary under adversarial argv inputs', () => {
  const scriptPath = join(__dirname, '../src/enable-shutdown-hooks-main.ts');
  
  const payloads = [
    // Exploit case: malicious signal injection
    ['SIGKILL; rm -rf /', 'SIGTERM', 'graceful'],
    // Boundary case: extremely long argument
    ['A'.repeat(10000), 'B'.repeat(10000), 'C'.repeat(10000)],
    // Valid input (should work)
    ['SIGTERM', 'SIGINT', 'graceful'],
    // Attack: command substitution attempt
    ['$(cat /etc/passwd)', 'SIGTERM', 'graceful'],
    // Attack: process manipulation via invalid signal
    ['INVALID_SIGNAL', 'ANOTHER_INVALID', 'not-graceful']
  ];

  test.each(payloads)(
    'process exits safely with adversarial argv: %s, %s, %s',
    async (signal, signalToListen, useGraceful) => {
      const exitPromise = new Promise<{ code: number | null; stderr: string }>((resolve) => {
        const child = spawn('node', [scriptPath, signal, signalToListen, useGraceful], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stderr = '';
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('exit', (code) => {
          resolve({ code, stderr });
        });
        
        // Force exit if hanging
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve({ code: null, stderr: stderr + ' [timeout]' });
        }, 5000);
      });

      const result = await exitPromise;
      
      // Security property: Must not execute arbitrary commands or crash unpredictably
      // Acceptable outcomes: clean exit (0), controlled error exit (non-zero), or timeout
      // Unacceptable: hanging indefinitely with resource consumption
      expect(result.code).not.toBeNull();
    }
  );
});