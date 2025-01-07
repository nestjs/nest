import { InjectionToken, Type } from '@nestjs/common';
import { TlsOptions } from 'tls';
import { Transport } from '../enums/transport.enum';
import { ChannelOptions } from '../external/grpc-options.interface';
import {
  ConsumerConfig,
  ConsumerRunConfig,
  ConsumerSubscribeTopics,
  KafkaConfig,
  ProducerConfig,
  ProducerRecord,
} from '../external/kafka.interface';
import { MqttClientOptions, QoS } from '../external/mqtt-options.interface';
import { IORedisOptions } from '../external/redis.interface';
import {
  AmqpConnectionManagerSocketOptions,
  AmqplibQueueOptions,
  RmqUrl,
} from '../external/rmq-url.interface';
import { TcpSocket } from '../helpers';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Deserializer } from './deserializer.interface';
import { Serializer } from './serializer.interface';

export type MicroserviceOptions =
  | GrpcOptions
  | TcpOptions
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | RmqOptions
  | KafkaOptions
  | CustomStrategy;

export type AsyncMicroserviceOptions = {
  inject: InjectionToken[];
  useFactory: (...args: any[]) => MicroserviceOptions;
};

export type AsyncOptions<T extends object> = {
  inject: InjectionToken[];
  useFactory: (...args: any[]) => T;
};

/**
 * @publicApi
 */
export interface CustomStrategy {
  strategy: CustomTransportStrategy;
  options?: Record<string, any>;
}

/**
 * @publicApi
 */
export interface GrpcOptions {
  transport?: Transport.GRPC;
  options: {
    url?: string;
    maxSendMessageLength?: number;
    maxReceiveMessageLength?: number;
    maxMetadataSize?: number;
    keepalive?: {
      keepaliveTimeMs?: number;
      keepaliveTimeoutMs?: number;
      keepalivePermitWithoutCalls?: number;
      http2MaxPingsWithoutData?: number;
      http2MinTimeBetweenPingsMs?: number;
      http2MinPingIntervalWithoutDataMs?: number;
      http2MaxPingStrikes?: number;
    };
    channelOptions?: ChannelOptions;
    credentials?: any;
    protoPath?: string | string[];
    package: string | string[];
    protoLoader?: string;
    packageDefinition?: any;
    gracefulShutdown?: boolean;
    onLoadPackageDefinition?: (pkg: any, server: any) => void;
    loader?: {
      keepCase?: boolean;
      alternateCommentMode?: boolean;
      longs?: Function;
      enums?: Function;
      bytes?: Function;
      defaults?: boolean;
      arrays?: boolean;
      objects?: boolean;
      oneofs?: boolean;
      json?: boolean;
      includeDirs?: string[];
    };
  };
}

/**
 * @publicApi
 */
export interface TcpOptions {
  transport?: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
    serializer?: Serializer;
    tlsOptions?: TlsOptions;
    deserializer?: Deserializer;
    socketClass?: Type<TcpSocket>;
  };
}

/**
 * @publicApi
 */
export interface RedisOptions {
  transport?: Transport.REDIS;
  options?: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
    /**
     * Use `psubscribe`/`pmessage` to enable wildcards in the patterns
     */
    wildcards?: boolean;
    serializer?: Serializer;
    deserializer?: Deserializer;
  } & IORedisOptions;
}

/**
 * @publicApi
 */
export interface MqttOptions {
  transport?: Transport.MQTT;
  options?: MqttClientOptions & {
    url?: string;
    serializer?: Serializer;
    deserializer?: Deserializer;
    subscribeOptions?: {
      /**
       * The QoS
       */
      qos: QoS;
      /*
       * No local flag
       * */
      nl?: boolean;
      /*
       * Retain as Published flag
       * */
      rap?: boolean;
      /*
       * Retain Handling option
       * */
      rh?: number;
    };
    userProperties?: Record<string, string | string[]>;
  };
}

/**
 * @publicApi
 */
export interface NatsOptions {
  transport?: Transport.NATS;
  options?: {
    headers?: Record<string, string>;
    authenticator?: any;
    debug?: boolean;
    ignoreClusterUpdates?: boolean;
    inboxPrefix?: string;
    encoding?: string;
    name?: string;
    user?: string;
    pass?: string;
    maxPingOut?: number;
    maxReconnectAttempts?: number;
    reconnectTimeWait?: number;
    reconnectJitter?: number;
    reconnectJitterTLS?: number;
    reconnectDelayHandler?: any;
    servers?: string[] | string;
    nkey?: any;
    reconnect?: boolean;
    pedantic?: boolean;
    tls?: any;
    queue?: string;
    serializer?: Serializer;
    deserializer?: Deserializer;
    userJWT?: string;
    nonceSigner?: any;
    userCreds?: any;
    useOldRequestStyle?: boolean;
    pingInterval?: number;
    preserveBuffers?: boolean;
    waitOnFirstConnect?: boolean;
    verbose?: boolean;
    noEcho?: boolean;
    noRandomize?: boolean;
    timeout?: number;
    token?: string;
    yieldTime?: number;
    tokenHandler?: any;
    gracefulShutdown?: boolean;
    gracePeriod?: number;
    [key: string]: any;
  };
}

/**
 * @publicApi
 */
export interface RmqOptions {
  transport?: Transport.RMQ;
  options?: {
    urls?: string[] | RmqUrl[];
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: AmqplibQueueOptions;
    socketOptions?: AmqpConnectionManagerSocketOptions;
    exchange?: string;
    routingKey?: string;
    noAck?: boolean;
    consumerTag?: string;
    serializer?: Serializer;
    deserializer?: Deserializer;
    replyQueue?: string;
    persistent?: boolean;
    headers?: Record<string, string>;
    noAssert?: boolean;
    /**
     * Maximum number of connection attempts.
     * Applies only to the consumer configuration.
     * -1 === infinite
     * @default -1
     */
    maxConnectionAttempts?: number;
  };
}

/**
 * @publicApi
 */
export interface KafkaParserConfig {
  keepBinary?: boolean;
}

/**
 * @publicApi
 */
export interface KafkaOptions {
  transport?: Transport.KAFKA;
  options?: {
    /**
     * Defaults to `"-server"` on server side and `"-client"` on client side.
     */
    postfixId?: string;
    client?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopics, 'topics'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    serializer?: Serializer;
    deserializer?: Deserializer;
    parser?: KafkaParserConfig;
    producerOnlyMode?: boolean;
  };
}
