import { Type } from '@nestjs/common';
import { ClientProxy } from '../client';
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

export type ClientOptions =
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | GrpcOptions
  | KafkaOptions
  | TcpClientOptions
  | RmqOptions;

export interface CustomClientOptions {
  customClass: Type<ClientProxy>;
  options?: Record<string, any>;
}

export interface TcpClientOptions {
  transport: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
    serializer?: Serializer;
    deserializer?: Deserializer;
  };
}
