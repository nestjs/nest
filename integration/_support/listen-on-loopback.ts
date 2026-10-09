import type { INestApplication } from '@nestjs/common';

/**
 * Initializes `app` and starts listening on a free port of 127.0.0.1, which
 * is where supertest sends its requests.
 *
 * Use it instead of `app.init()` in specs that test through supertest. Given
 * a server that is not listening, supertest listens on port 0 of every
 * interface (`::`), and on some systems another process can then hold the
 * same port on 127.0.0.1; the requests reach that process instead, and the
 * test fails with "socket hang up" or an unexpected response.
 */
export async function listenOnLoopback<T extends INestApplication>(
  app: T,
): Promise<T> {
  await app.listen(0, '127.0.0.1');
  return app;
}
