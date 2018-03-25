import { Transport } from './../enums/transport.enum';
import {
  TcpOptions,
  RedisOptions,
  NatsOptions,
  MqttOptions,
  GrpcOptions,
} from './microservice-configuration.interface';

export type ClientOptions =
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | GrpcOptions
  | TcpClientOptions;

export interface TcpClientOptions {
  transport: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
  };
}
