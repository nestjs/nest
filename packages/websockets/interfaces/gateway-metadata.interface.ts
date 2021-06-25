/**
 * @external https://github.com/socketio/socket.io/blob/master/lib/index.ts
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export interface GatewayMetadata {
  /**
   * The name of a namespace
   */
  namespace?: string | RegExp;
  /**
   * Name of the path to capture
   * @default "/socket.io"
   */
  path?: string;
  /**
   * Whether to serve the client files
   * @default true
   */
  serveClient?: boolean;
  /**
   * The adapter to use
   * @default the in-memory adapter (https://github.com/socketio/socket.io-adapter)
   */
  adapter?: any;
  /**
   * The parser to use
   * @default the default parser (https://github.com/socketio/socket.io-parser)
   */
  parser?: any;
  /**
   * How many ms before a client without namespace is closed
   * @default 45000
   */
  connectTimeout?: number;
  /**
   * How many ms without a pong packet to consider the connection closed
   * @default 5000
   */
  pingTimeout?: number;
  /**
   * How many ms before sending a new ping packet
   * @default 25000
   */
  pingInterval?: number;
  /**
   * How many ms before an uncompleted transport upgrade is cancelled
   * @default 10000
   */
  upgradeTimeout?: number;
  /**
   * How many bytes or characters a message can be, before closing the session (to avoid DoS).
   * @default 1e5 (100 KB)
   */
  maxHttpBufferSize?: number;
  /**
   * A function that receives a given handshake or upgrade request as its first parameter,
   * and can decide whether to continue or not. The second argument is a function that needs
   * to be called with the decided information: fn(err, success), where success is a boolean
   * value where false means that the request is rejected, and err is an error code.
   */
  allowRequest?: (
    req: any,
    fn: (err: string | null | undefined, success: boolean) => void,
  ) => void;
  /**
   * The low-level transports that are enabled
   * @default ["polling", "websocket"]
   */
  transports?: Array<'polling' | 'websocket'>;
  /**
   * Whether to allow transport upgrades
   * @default true
   */
  allowUpgrades?: boolean;
  /**
   * Parameters of the WebSocket permessage-deflate extension (see ws module api docs). Set to false to disable.
   * @default false
   */
  perMessageDeflate?: boolean | object;
  /**
   * Parameters of the http compression for the polling transports (see zlib api docs). Set to false to disable.
   * @default true
   */
  httpCompression?: boolean | object;
  /**
   * What WebSocket server implementation to use. Specified module must
   * conform to the ws interface (see ws module api docs). Default value is ws.
   * An alternative c++ addon is also available by installing uws module.
   */
  wsEngine?: string;
  /**
   * An optional packet which will be concatenated to the handshake packet emitted by Engine.IO.
   */
  initialPacket?: any;
  /**
   * Configuration of the cookie that contains the client sid to send as part of handshake response headers. This cookie
   * might be used for sticky-session. Defaults to not sending any cookie.
   * @default false
   */
  cookie?: any | boolean;
  /**
   * The options that will be forwarded to the cors module
   */
  cors?: CorsOptions;
  /**
   * Whether to enable compatibility with Socket.IO v2 clients
   * @default false
   */
  allowEIO3?: boolean;
  /**
   * Destroy unhandled upgrade requests
   * @default true
   */
  destroyUpgrade?: boolean;
  /**
   * Milliseconds after which unhandled requests are ended
   * @default 1000
   */
  destroyUpgradeTimeout?: number;
}
