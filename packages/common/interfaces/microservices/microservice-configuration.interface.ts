import { Transport } from '../../enums/transport.enum';
import { MqttClientOptions } from '../external/mqtt-options.interface';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Options } from 'amqplib';

export type MicroserviceOptions =
  | GrpcOptions
  | TcpOptions
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | RmqOptions
  | CustomStrategy;

export interface CustomStrategy {
  strategy?: CustomTransportStrategy;
  options?: {};
}

export interface GrpcOptions {
  transport?: Transport.GRPC;
  options: {
    url?: string;
    credentials?: any;
    protoPath: string;
    root?: string;
    package: string;
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
    tls?: any;
  };
}

export interface RmqOptions {
  transport?: Transport.RMQ;
  options?: {
    url?: string;
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: Options.AssertQueue;
  };
}