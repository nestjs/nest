import { ConnectionOptions } from 'tls';
import { TcpSocketConnectOpts } from 'net';

/**
 * @publicApi
 */
export interface RmqUrl {
  protocol?: string;
  hostname?: string;
  port?: number;
  username?: string;
  password?: string;
  locale?: string;
  frameMax?: number;
  heartbeat?: number;
  vhost?: string;
}

interface ClientProperties {
  connectionName?: string;
  [key: string]: any;
}

type AmqpConnectionOptions = (ConnectionOptions | TcpSocketConnectOpts) & {
  noDelay?: boolean;
  timeout?: number;
  keepAlive?: boolean;
  keepAliveDelay?: number;
  clientProperties?: any;
  credentials?:
    | {
        mechanism: string;
        username: string;
        password: string;
        response: () => Buffer;
      }
    | {
        mechanism: string;
        response: () => Buffer;
      }
    | undefined;
};

/**
 * @publicApi
 */
export interface AmqpConnectionManagerSocketOptions {
  reconnectTimeInSeconds?: number;
  heartbeatIntervalInSeconds?: number;
  findServers?: () => string | string[];
  connectionOptions?: AmqpConnectionOptions;
  clientProperties?: ClientProperties;
  [key: string]: any;
}

/**
 * @publicApi
 */
export interface AmqplibQueueOptions {
  durable?: boolean;
  autoDelete?: boolean;
  arguments?: any;
  messageTtl?: number;
  expires?: number;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  maxLength?: number;
  maxPriority?: number;
  [key: string]: any;
}
