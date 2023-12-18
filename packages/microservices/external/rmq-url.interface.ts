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

/**
 * @publicApi
 */
export interface AmqpConnectionManagerSocketOptions {
  reconnectTimeInSeconds?: number;
  heartbeatIntervalInSeconds?: number;
  findServers?: () => string | string[];
  connectionOptions?: any;
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
