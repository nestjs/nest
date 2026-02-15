import type { Type } from '@nestjs/common';
import { ConnectionOptions } from 'tls';
import { ClientProxy } from '../client/index.js';
import { Transport } from '../enums/transport.enum.js';
import { TcpSocket } from '../helpers/index.js';
import { Deserializer } from './deserializer.interface.js';
import {
  GrpcOptions,
  KafkaOptions,
  MqttOptions,
  NatsOptions,
  RedisOptions,
  RmqOptions,
} from './microservice-configuration.interface.js';
import { Serializer } from './serializer.interface.js';

export type ClientOptions =
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | GrpcOptions
  | KafkaOptions
  | TcpClientOptions
  | RmqOptions;

/**
 * @publicApi
 */
export interface CustomClientOptions {
  customClass: Type<ClientProxy>;
  options?: Record<string, any>;
}

/**
 * @publicApi
 */
export interface TcpClientOptions {
  transport: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
    serializer?: Serializer;
    deserializer?: Deserializer;
    tlsOptions?: ConnectionOptions;
    socketClass?: Type<TcpSocket>;
    /**
     * Maximum buffer size in characters (default: 128MB in characters, i.e., (512 * 1024 * 1024) / 4).
     * This limit prevents memory exhaustion when receiving large TCP messages.
     */
    maxBufferSize?: number;
  };
}
