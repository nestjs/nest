/**
 * Interface defining the method called for each client that connects to the
 * gateway.
 *
 * The hook doesn't hold back the client's messages: they are handled as they
 * arrive, even while an async `handleConnection()` is still pending. Use
 * guards to check each message, or connection-level middleware to reject a
 * client before any of its messages is handled: socket.io's `server.use()` in
 * `afterInit()`, or, with `WsAdapter`, a `verifyClient` function in the
 * `@WebSocketGateway()` options.
 *
 * @see [Lifecycle hooks](https://docs.nestjs.com/websockets/gateways#lifecycle-hooks)
 *
 * @publicApi
 */
export interface OnGatewayConnection<T = any> {
  handleConnection(client: T, ...args: any[]): any;
}
