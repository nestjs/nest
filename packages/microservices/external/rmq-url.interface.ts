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

export interface AmqpConnectionManagerSocketOptions {
  reconnectTimeInSeconds?: number
  heartbeatIntervalInSeconds?: number
  findServers?: () => string | string[]
  connectionOptions?: any
}

export interface AmqplibQueueOptions{
  exclusive?: boolean
  durable?: boolean
  autoDelete?: boolean
  arugments?: any
  messageTtl?: number
  expires?: number
  deadLetterExchange?: string
  maxLength?: number
  maxPriority?: number
}
