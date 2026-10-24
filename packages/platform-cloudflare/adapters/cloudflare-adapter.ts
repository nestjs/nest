import { Logger, type NestApplicationOptions } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Server } from 'http';

/**
 * Express adapter for the Cloudflare Workers runtime.
 *
 * Workers implement `node:http` on top of their `fetch` handler (see
 * https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), so the
 * Express adapter runs there as is, apart from the parts of Node.js that the
 * runtime emulates without a real connection:
 *
 * - the port passed to `listen()` is a routing key for `handleAsNodeRequest()`,
 *   not a socket, and a host name is not supported;
 * - TLS is terminated by Cloudflare, so `httpsOptions` cannot be honored;
 * - there are no connections to track, so `forceCloseConnections` is a no-op;
 * - `request.socket` only carries address information: it lacks the tuning
 *   methods that Server-Sent Events call, and never emits `close`, which is
 *   what the core watches to detect a client that went away.
 *
 * `getType()` still returns `'express'`, so that packages branching on the
 * platform (e.g. `@nestjs/swagger`, `MulterModule`) treat it as Express.
 *
 * @publicApi
 */
export class CloudflareAdapter extends ExpressAdapter {
  private readonly cloudflareLogger = new Logger(CloudflareAdapter.name);

  constructor(instance?: any) {
    super(instance);
    this.instance.use(bridgeSocket);
  }

  public initHttpServer(options: NestApplicationOptions) {
    const { httpsOptions, forceCloseConnections, ...supportedOptions } =
      options ?? {};
    if (httpsOptions) {
      this.cloudflareLogger.warn(
        '"httpsOptions" is ignored on Cloudflare Workers, where TLS is terminated by Cloudflare',
      );
    }
    if (forceCloseConnections) {
      this.cloudflareLogger.warn(
        '"forceCloseConnections" is ignored on Cloudflare Workers, which manage connections themselves',
      );
    }
    super.initHttpServer(supportedOptions);
  }

  public listen(port: string | number, callback?: () => void): Server;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): Server;
  public listen(port: any, ...args: any[]): Server {
    // The runtime only supports "listen(port)": a host name has no meaning
    // for a server that is reached through "handleAsNodeRequest()"
    const callback = args.find(arg => typeof arg === 'function');
    return this.httpServer.listen(Number(port), callback);
  }

  /**
   * Returns the port the server listens on, i.e. the key that
   * `handleAsNodeRequest()` routes requests with. Resolves a port of `0`,
   * which lets the runtime pick one.
   */
  public getPort(): number | undefined {
    const address = this.httpServer?.address();
    return address && typeof address === 'object' ? address.port : undefined;
  }
}

/**
 * Completes the socket-like object of the runtime with what the core expects
 * from a `net.Socket`: no-op tuning methods, and a `close` event (with
 * `destroyed` set) once the response has closed, which the runtime reports
 * when the client disconnects as well as when the response is complete.
 */
function bridgeSocket(req: any, res: any, next: () => void) {
  const socket = req.socket;
  if (socket && typeof socket.setKeepAlive !== 'function') {
    socket.setKeepAlive = () => socket;
    socket.setNoDelay = () => socket;
    socket.setTimeout = () => socket;
    res.once('close', () => {
      if (socket.destroyed) {
        return;
      }
      socket.destroyed = true;
      socket.emit?.('close', false);
    });
  }
  next();
}
