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
