import * as http from 'node:http';

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

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
