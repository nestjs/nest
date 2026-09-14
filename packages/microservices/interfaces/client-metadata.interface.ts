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
    /**
     * How long a peer may stay silent in the middle of a packet before the
     * connection is dropped, in milliseconds (default: 30000). The timer is
     * refreshed on every read, so a slow but progressing transfer is never
     * interrupted; it only fires when a peer stops sending mid-packet, which
     * would otherwise pin the partial packet in memory indefinitely.
     * Set to 0 to disable.
     */
    incompleteMessageTimeout?: number;
    /**
     * Maximum number of bytes that may sit queued for a peer that is not
     * reading them, in bytes (default: 128MB). Reading from the peer is
     * suspended while the outgoing buffer is backed up, and the connection is
     * dropped once this limit is passed. Set to 0 to disable.
     */
    maxSendBufferSize?: number;
  };
}
