import type { LoggerService } from '@nestjs/common';
import { createServer } from 'node:net';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Waits until `check` passes. */
export async function until(
  check: () => boolean | Promise<boolean>,
  timeout = 5_000,
) {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting');
    await sleep(10);
  }
}

/** Keeps what the application logs, as `[Context] message` lines. */
export function capturingLogger() {
  const lines: string[] = [];
  const write = (message: unknown, ...rest: unknown[]) => {
    const context = rest.at(-1);
    lines.push(
      typeof context === 'string' ? `[${context}] ${message}` : String(message),
    );
  };
  const logger: LoggerService = { log: write, warn: write, error: write };
  return {
    logger,
    lines,
    matching: (line: string) => lines.filter(logged => logged === line),
  };
}

/** A port nothing listens on, on the loopback interface. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}
