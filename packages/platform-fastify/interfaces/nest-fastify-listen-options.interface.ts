import type { FastifyListenOptions } from 'fastify';

/**
 * @publicApi
 */
export interface NestFastifyListenOptions extends FastifyListenOptions {
  /**
   * A file descriptor of a socket that is already bound, such as the one
   * systemd passes on socket activation. Not supported on Windows.
   * @see [server.listen(handle)](https://nodejs.org/api/net.html#serverlistenhandle-backlog-callback)
   */
  fd?: number;
}
