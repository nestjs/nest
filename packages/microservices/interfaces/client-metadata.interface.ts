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
     * Maximum buffer size in characters (default: 128 * 1024 * 1024, which a
     * string holds in 128 to 256MB). This limit prevents memory exhaustion
     * when receiving large TCP messages; a packet declaring a greater length
     * is rejected before any of it is buffered.
     */
    maxBufferSize?: number;
    /**
     * How long a peer may stay silent in the middle of a packet before the
     * connection is dropped, in milliseconds (default: 30000). The timer is
     * refreshed on every read, so it never interrupts a slow but progressing
     * transfer (see "messageReceiveTimeout"); it only fires when a peer stops
     * sending mid-packet, which would otherwise pin the partial packet in
     * memory indefinitely.
     * Set to 0 to disable.
     */
    incompleteMessageTimeout?: number;
    /**
     * How long a peer may take to send a single packet, from its first
     * character to its last, before the connection is dropped, in milliseconds
     * (default: 300000). Unlike "incompleteMessageTimeout", it is not extended
     * by further reads, so a peer cannot hold a partial packet in memory by
     * sending a little now and then. Time spent with reading suspended due to
     * backpressure does not count. Set to 0 to disable.
     */
    messageReceiveTimeout?: number;
    /**
     * Maximum number of bytes that may sit queued for a peer that is not
     * reading them, in bytes (default: 128MB). The client keeps reading
     * replies while the outgoing buffer is backed up, and the connection is
     * dropped once this limit is passed. Set to 0 to disable.
     */
    maxSendBufferSize?: number;
  };
}
