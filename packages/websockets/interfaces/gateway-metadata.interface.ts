/**
 * @external https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/socket.io/index.d.ts
 */

export interface GatewayMetadata {
  /**
   * The name of a namespace
   */
  namespace?: string | RegExp;

  /**
   * The path to ws
   * @default '/socket.io'
   */
  path?: string;

  /**
   * Should we serve the client file?
   * @default true
   */
  serveClient?: boolean;

  /**
   * The adapter to use for handling rooms. NOTE: this should be a class,
   * not an object
   * @default typeof Adapter
   */
  adapter?: any;

  /**
   * Accepted origins
   * @default '*:*'
   */
  origins?: string;

  parser?: any;

  /**
   * How many milliseconds without a pong packed to consider the connection closed (engine.io)
   * @default 60000
   */
  pingTimeout?: number;

  /**
   * How many milliseconds before sending a new ping packet (keep-alive) (engine.io)
   * @default 25000
   */
  pingInterval?: number;

  /**
   * How many bytes or characters a message can be when polling, before closing the session
   * (to avoid Dos) (engine.io)
   * @default 10E7
   */
  maxHttpBufferSize?: number;

  /**
   * Transports to allow connections to (engine.io)
   * @default ['polling','websocket']
   */
  transports?: string[];

  /**
   * Whether to allow transport upgrades (engine.io)
   * @default true
   */
  allowUpgrades?: boolean;

  /**
   * parameters of the WebSocket permessage-deflate extension (see ws module).
   * Set to false to disable (engine.io)
   * @default true
   */
  perMessageDeflate?: Record<string, any> | boolean;

  /**
   * Parameters of the http compression for the polling transports (see zlib).
   * Set to false to disable, or set an object with parameter "threshold:number"
   * to only compress data if the byte size is above this value (1024) (engine.io)
   * @default true|1024
   */
  httpCompression?: Record<string, any> | boolean;

  /**
   * Name of the HTTP cookie that contains the client sid to send as part of
   * handshake response headers. Set to false to not send one (engine.io)
   * @default "io"
   */
  cookie?: string | boolean;

  /**
   * Whether to let engine.io handle the OPTIONS requests.
   * You can also pass a custom function to handle the requests
   * @default true
   */
  handlePreflightRequest?: ((req: any, res: any) => void) | boolean;
}
