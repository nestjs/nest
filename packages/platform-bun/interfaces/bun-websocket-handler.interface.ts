import type { Server, WebSocketHandler } from 'bun';

/**
 * Hooks a WebSocket adapter into the `Bun.serve()` instance behind
 * `BunHttpServer`, so gateways share the HTTP port (see
 * `BunHttpServer.setWebSocketHandler()`).
 *
 * @publicApi
 */
export interface BunWebSocketHandler {
  /**
   * Called for every request carrying `Upgrade: websocket`. Returns `true`
   * once `server.upgrade()` succeeded; `false` lets the request through to
   * the HTTP pipeline.
   */
  upgrade(request: Request, server: Server<any>): boolean;
  /** The `websocket` option handed to `Bun.serve()`. */
  websocket: WebSocketHandler<any>;
}
