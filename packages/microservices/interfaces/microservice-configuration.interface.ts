import { MqttClientOptions } from '@nestjs/common/interfaces/external/mqtt-options.interface';
import { Transport } from '../enums/transport.enum';
import { Server } from './../server/server';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';

export type MicroserviceOptions =
  | GrpcOptions
  | TcpOptions
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | RmqOptions
  | CustomStrategy;

export interface CustomStrategy {
  strategy: Server & CustomTransportStrategy;
  options?: {};
}

export interface GrpcOptions {
  transport?: Transport.GRPC;
  options: {
    url?: string;
    maxSendMessageLength?: number;
    maxReceiveMessageLength?: number;
    credentials?: any;
    protoPath: string;
    package: string;
    protoLoader?: string;
    /** @deprecated */
    root?: string;
    loader?: {
      keepCase?: boolean;
      alternateCommentMode?: boolean;
      longs?: Function;
      enums?: Function;
      bytes?: Function;
      defaults?: boolean;
      arrays?: boolean;
      objects?: boolean;
      oneofs?: boolean;
      json?: boolean;
      includeDirs?: string[];
    };
  };
}

export interface TcpOptions {
  transport?: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };
}

export interface RedisOptions {
  transport?: Transport.REDIS;
  options?: {
    url?: string;
    retryAttempts?: number;
    retryDelay?: number;
  };
}

export interface MqttOptions {
  transport?: Transport.MQTT;
  options?: MqttClientOptions & {
    url?: string;
  };
}

export interface NatsOptions {
  transport?: Transport.NATS;
  options?: {
    url?: string;
    name?: string;
    pass?: string;
    maxReconnectAttempts?: number;
    reconnectTimeWait?: number;
    servers?: string[];
    reconnect?: boolean;
    pedantic?: boolean;
    tls?: any;
    queue?: string;
  };
}

export interface RmqOptions {
  transport?: Transport.RMQ;
  options?: {
    urls?: string[];
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: any;
  };
}
