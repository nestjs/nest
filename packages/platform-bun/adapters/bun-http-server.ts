import { EventEmitter } from 'node:events';
import type { Server } from 'bun';
import type { BunServeOptions } from '../interfaces/bun-adapter-options.interface.js';
import type { BunWebSocketHandler } from '../interfaces/bun-websocket-handler.interface.js';

export type FetchHandler = (
  request: Request,
  server: Server<unknown>,
) => Response | Promise<Response>;

export interface ServerAddress {
  address: string;
  family: 'IPv4' | 'IPv6';
  port: number;
}

/**
 * Wraps `Bun.serve()` in the parts of the Node `net.Server` API that Nest's
 * core touches: `listen`, `close`, `address`, and the `'error'`/`'listening'`
 * events. `getHttpServer()` returns this.
 *
 * @publicApi
 */
export class BunHttpServer extends EventEmitter {
  /** The live `Bun.serve()` instance once listening. */
  public bun: Server<unknown> | null = null;
  private unixPath: string | null = null;
  private closing = false;
  private webSocketHandler: BunWebSocketHandler | null = null;

  constructor(
    private readonly fetchHandler: FetchHandler,
    private readonly options: BunServeOptions = {},
  ) {
    super();
  }

  public get listening(): boolean {
    return this.bun !== null;
  }

  /**
   * Routes `Upgrade: websocket` requests to a WebSocket adapter on the same
   * port. `Bun.serve()` takes its `websocket` option at start-up only, so this
   * must be called before `listen()` (gateways are created during
   * `app.init()`, which runs first).
   */
  public setWebSocketHandler(handler: BunWebSocketHandler): void {
    if (this.bun) {
      throw new Error(
        'Cannot attach a WebSocket handler to a listening BunHttpServer. ' +
          'Set up WebSocket gateways before calling app.listen().',
      );
    }
    if (this.webSocketHandler && this.webSocketHandler !== handler) {
      throw new Error('A WebSocket handler is already attached.');
    }
    this.webSocketHandler = handler;
  }

  public listen(
    port: number | string,
    hostname?: string,
    callback?: (err?: Error) => void,
  ): this {
    this.closing = false;
    if (this.bun) {
      const err = new Error('Server is already listening');
      callback ? callback(err) : this.emit('error', err);
      return this;
    }
    const { shutdownTimeout: _shutdownTimeout, ...serveOptions } = this.options;
    const webSocketHandler = this.webSocketHandler;
    const base = {
      idleTimeout: 120,
      ...serveOptions,
      ...(webSocketHandler && { websocket: webSocketHandler.websocket }),
      fetch: async (request: Request, server: Server<unknown>) => {
        // A successful upgrade must answer with `undefined`.
        if (
          webSocketHandler &&
          request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
          webSocketHandler.upgrade(request, server)
        ) {
          return undefined;
        }
        const response = await this.fetchHandler(request, server);
        // While draining, ask clients to drop their keep-alive connections.
        if (this.closing) {
          try {
            response.headers.set('connection', 'close');
          } catch {
            /* immutable headers */
          }
        }
        return response;
      },
      error: (error: Error) => {
        this.emit('clientError', error);
        return new Response('Internal Server Error', { status: 500 });
      },
    };
    try {
      if (typeof port === 'string' && !/^\d+$/.test(port)) {
        this.unixPath = port;
        this.bun = Bun.serve({ ...base, unix: port } as never);
      } else {
        this.bun = Bun.serve({
          ...base,
          port: Number(port),
          hostname,
        } as never);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (this.listenerCount('error') > 0) {
        this.emit('error', err);
      } else if (callback) {
        callback(err);
      } else {
        throw err;
      }
      return this;
    }
    this.emit('listening');
    callback?.();
    return this;
  }

  /** Node-compatible: `{ address, family, port }`, a path for unix sockets, or `null` when not listening. */
  public address(): ServerAddress | string | null {
    if (!this.bun) {
      return null;
    }
    if (this.unixPath) {
      return this.unixPath;
    }
    const address = this.bun.hostname ?? '0.0.0.0';
    return {
      address,
      family: address.includes(':') ? 'IPv6' : 'IPv4',
      port: this.bun.port ?? 0,
    };
  }

  public close(callback?: (err?: Error) => void): this;
  public close(force: boolean, callback?: (err?: Error) => void): this;
  public close(
    forceOrCb?: boolean | ((err?: Error) => void),
    maybeCb?: (err?: Error) => void,
  ): this {
    const force = typeof forceOrCb === 'boolean' ? forceOrCb : false;
    const callback = typeof forceOrCb === 'function' ? forceOrCb : maybeCb;
    if (!this.bun) {
      callback?.(new Error('Server is not running'));
      return this;
    }
    const server = this.bun;
    this.bun = null;
    this.unixPath = null;
    void this.shutdown(server, force).then(() => {
      this.emit('close');
      callback?.();
    });
    return this;
  }

  /**
   * Graceful by default: let in-flight requests finish (up to `shutdownTimeout`),
   * then stop and drop every connection, including idle keep-alive ones.
   * Bun's `stop(false)` cannot be followed by `stop(true)`, so we wait first.
   * `force` skips the wait.
   */
  private async shutdown(
    server: Server<unknown>,
    force: boolean,
  ): Promise<void> {
    if (!force) {
      this.closing = true;
      const deadline = Date.now() + (this.options.shutdownTimeout ?? 10_000);
      while (server.pendingRequests > 0 && Date.now() < deadline) {
        await Bun.sleep(5);
      }
    }
    await server.stop(true);
  }

  /** Destroys in-flight connections (Node's `server.closeAllConnections()`). */
  public closeAllConnections(): void {
    void this.bun?.stop(true);
  }

  /** Promise-friendly close used by the adapter. */
  public stop(force = false): Promise<void> {
    return new Promise(resolve => {
      if (!this.bun) {
        return resolve();
      }
      this.close(force, () => resolve());
    });
  }
}
