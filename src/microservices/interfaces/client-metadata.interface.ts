import { Transport } from './../enums/transport.enum';
import {
  TcpOptions,
  RedisOptions,
  NatsOptions,
  MqttOptions,
  GrpcOptions,
} from './microservice-configuration.interface';

export interface ClientOptions {
  transport?: Transport;
  options?:
    | TcpClientOptions
    | RedisOptions
    | NatsOptions
    | MqttOptions
    | GrpcOptions;
}

export interface TcpClientOptions {
  host?: string;
  port?: number;
}
