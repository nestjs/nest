import { Type } from '@nestjs/common';
import { ClientProxy } from '../client';
import { TcpSocket, LocalDomainSocket } from '../helpers';
import { Transport } from '../enums/transport.enum';
import { Deserializer } from './deserializer.interface';
import {
  GrpcOptions,
  KafkaOptions,
  MqttOptions,
  NatsOptions,
  RedisOptions,
  RmqOptions,
} from './microservice-configuration.interface';
import { Serializer } from './serializer.interface';
import { ConnectionOptions } from 'tls';

export type ClientOptions =
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | GrpcOptions
  | KafkaOptions
  | TcpClientOptions
  | LocalDomainClientOptions
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
  };
}

/**
 * @publicApi
 */
export interface LocalDomainClientOptions {
  transport: Transport.LOCAL_DOMAIN;
  options: {
    path: string;
    serializer?: Serializer;
    deserializer?: Deserializer;
    socketClass?: Type<LocalDomainSocket>;
  };
}
