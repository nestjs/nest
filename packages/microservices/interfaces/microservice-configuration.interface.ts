import { Transport } from '../enums/transport.enum';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { IClientOptions } from 'mqtt';
import { ServerCredentials } from 'grpc';
import { Server } from './../server/server';

export interface MicroserviceOptions {
  transport?: Transport;
  strategy?: Server & CustomTransportStrategy;
  options?:
    | TcpOptions
    | RedisOptions
    | NatsOptions
    | MqttOptions;
}

export interface GrpcOptions {
  url?: string;
  credentials?: ServerCredentials;
  protoPath: string;
  package: string;
}

export interface TcpOptions {
  host?: string;
  port?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RedisOptions {
  url?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MqttOptions extends IClientOptions {
  url?: string;
}

export interface NatsOptions {
  url?: string;
  name?: string;
  pass?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
  servers?: string[];
  tls?: any;
}