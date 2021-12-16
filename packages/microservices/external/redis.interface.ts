/**
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/ioredis/index.d.ts
 */
export interface IORedisOptions {
  port?: number | undefined;
  host?: string | undefined;
  /**
   * 4 (IPv4) or 6 (IPv6), Defaults to 4.
   */
  family?: number | undefined;
  /**
   * Local domain socket path. If set the port, host and family will be ignored.
   */
  path?: string | undefined;
  /**
   * TCP KeepAlive on the socket with a X ms delay before start. Set to a non-number value to disable keepAlive.
   */
  keepAlive?: number | undefined;
  /**
   * Whether to disable the Nagle's Algorithm.
   */
  noDelay?: boolean | undefined;
  /**
   * Force numbers to be always returned as JavaScript strings. This option is necessary when dealing with big numbers (exceed the [-2^53, +2^53] range).
   */
  stringNumbers?: boolean | undefined;
  /**
   * Default script definition caching time.
   */
  maxScriptsCachingTime?: number | undefined;
  connectionName?: string | undefined;
  /**
   * If set, client will send AUTH command with the value of this option as the first argument when connected. The `password` option must be set too. Username should only be set for Redis >=6.
   */
  username?: string | undefined;
  /**
   * If set, client will send AUTH command with the value of this option when connected.
   */
  password?: string | undefined;
  /**
   * Database index to use.
   */
  db?: number | undefined;
  /**
   * When a connection is established to the Redis server, the server might still be loading
   * the database from disk. While loading, the server not respond to any commands.
   * To work around this, when this option is true, ioredis will check the status of the Redis server,
   * and when the Redis server is able to process commands, a ready event will be emitted.
   */
  enableReadyCheck?: boolean | undefined;
  keyPrefix?: string | undefined;
  /**
   * When the return value isn't a number, ioredis will stop trying to reconnect.
   * Fixed in: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/15858
   */
  retryStrategy?(times: number): number | void | null;
  /**
   * By default, all pending commands will be flushed with an error every
   * 20 retry attempts. That makes sure commands won't wait forever when
   * the connection is down. You can change this behavior by setting
   * `maxRetriesPerRequest`.
   *
   * Set maxRetriesPerRequest to `null` to disable this behavior, and
   * every command will wait forever until the connection is alive again
   * (which is the default behavior before ioredis v4).
   */
  maxRetriesPerRequest?: number | null | undefined;
  /**
   * The milliseconds before a timeout occurs when executing a single
   * command. By default, there is no timeout and the client will wait
   * indefinitely. The timeout is enforced only on the client side, not
   * server side. The server may still complete the operation after a
   * timeout error occurs on the client side.
   */
  commandTimeout?: number | undefined;
  /**
   * 1/true means reconnect, 2 means reconnect and resend failed command. Returning false will ignore
   * the error and do nothing.
   */
  reconnectOnError?(error: Error): boolean | 1 | 2;
  /**
   * By default, if there is no active connection to the Redis server, commands are added to a queue
   * and are executed once the connection is "ready" (when enableReadyCheck is true, "ready" means
   * the Redis server has loaded the database from disk, otherwise means the connection to the Redis
   * server has been established). If this option is false, when execute the command when the connection
   * isn't ready, an error will be returned.
   */
  enableOfflineQueue?: boolean | undefined;
  /**
   * The milliseconds before a timeout occurs during the initial connection to the Redis server.
   * default: 10000.
   */
  connectTimeout?: number | undefined;
  /**
   * The milliseconds before socket.destroy() is called after socket.end() if the connection remains half-open during disconnection.
   * default: 2000
   */
  disconnectTimeout?: number | undefined;
  /**
   * After reconnected, if the previous connection was in the subscriber mode, client will auto re-subscribe these channels.
   * default: true.
   */
  autoResubscribe?: boolean | undefined;
  /**
   * If true, client will resend unfulfilled commands(e.g. block commands) in the previous connection when reconnected.
   * default: true.
   */
  autoResendUnfulfilledCommands?: boolean | undefined;
  lazyConnect?: boolean | undefined;
  tls?: any | undefined;
  /**
   * default: "master".
   */
  role?: 'master' | 'slave' | undefined;
  /**
   * default: null.
   */
  name?: string | undefined;
  sentinelUsername?: string | undefined;
  sentinelPassword?: string | undefined;
  sentinels?: Array<{ host: string; port: number }> | undefined;
  /**
   * If `sentinelRetryStrategy` returns a valid delay time, ioredis will try to reconnect from scratch.
   * default: function(times) { return Math.min(times * 10, 1000); }
   */
  sentinelRetryStrategy?(times: number): number | void | null;
  /**
   * Can be used to prefer a particular slave or set of slaves based on priority.
   */
  preferredSlaves?: any | undefined;
  /**
   * Whether to support the `tls` option when connecting to Redis via sentinel mode.
   * default: false.
   */
  enableTLSForSentinelMode?: boolean | undefined;
  sentinelTLS?: any | undefined;
  /**
   * NAT map for sentinel connector.
   * default: null.
   */
  natMap?: any | undefined;
  /**
   * Update the given `sentinels` list with new IP addresses when communicating with existing sentinels.
   * default: true.
   */
  updateSentinels?: boolean | undefined;
  /**
   * Enable READONLY mode for the connection. Only available for cluster mode.
   * default: false.
   */
  readOnly?: boolean | undefined;
  /**
   * If you are using the hiredis parser, it's highly recommended to enable this option.
   * Create another instance with dropBufferSupport disabled for other commands that you want to return binary instead of string
   */
  dropBufferSupport?: boolean | undefined;
  /**
   * Whether to show a friendly error stack. Will decrease the performance significantly.
   */
  showFriendlyErrorStack?: boolean | undefined;
  /**
   * When enabled, all commands issued during an event loop iteration are automatically wrapped in a
   * pipeline and sent to the server at the same time. This can improve performance by 30-50%.
   * default: false.
   */
  enableAutoPipelining?: boolean | undefined;
}
