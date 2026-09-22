import * as http from 'node:http';

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Polls `predicate` until it holds or `timeoutMs` elapses; resolves to whether
 * it eventually held.
 */
export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 1000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      return false;
    }
    await sleep(5);
  }
  return true;
}

/**
 * Issues a GET request and returns a function that closes the client
 * connection, ignoring the resulting socket errors.
 */
export function startRequest(port: number, path: string): () => void {
  const req = http.get({ host: '127.0.0.1', port, path }, res => {
    res.on('data', () => undefined);
    res.on('error', () => undefined);
  });
  req.on('error', () => undefined);
  return () => req.destroy();
}

/**
 * Issues a GET request and closes the client connection after `killAfterMs`,
 * simulating a client that goes away while the server is still producing.
 */
export function requestAndAbort(
  port: number,
  path: string,
  killAfterMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path }, res => {
      res.on('data', () => undefined);
      res.on('error', () => undefined);
    });
    req.on('error', err => {
      if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') {
        reject(err);
      }
    });
    setTimeout(() => {
      req.destroy();
      resolve();
    }, killAfterMs);
  });
}

export function getJson<T = any>(port: number, path: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as T);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}
