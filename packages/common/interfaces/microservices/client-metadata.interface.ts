import { Transport } from '../../enums/transport.enum';
import {
  RedisOptions,
  NatsOptions,
  MqttOptions,
  GrpcOptions,
  RmqOptions,
} from './microservice-configuration.interface';

export interface ClientOptions {
  transport?: Transport;
  options?:
    | TcpClientOptions
    | RedisOptions
    | NatsOptions
    | MqttOptions
    | GrpcOptions
    | RmqOptions;
}

export interface TcpClientOptions {
  host?: string;
  port?: number;
}
