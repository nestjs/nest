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

export type TransportId = Transport | symbol;

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
    /**
     * An array of connection URLs to try in order.
     */
    urls?: string[] | RmqUrl[];
    /**
     * The name of the queue.
     */
    queue?: string;
    /**
     * A prefetch count for this channel. The count given is the maximum number of messages sent over the channel that can be awaiting acknowledgement;
     * once there are count messages outstanding, the server will not send more messages on this channel until one or more have been acknowledged.
     */
    prefetchCount?: number;
    /**
     * Sets the per-channel behavior for prefetching messages.
     */
    isGlobalPrefetchCount?: boolean;
    /**
     * Amqplib queue options.
     * @see https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue
     */
    queueOptions?: AmqplibQueueOptions;
    /**
     * AMQP Connection Manager socket options.
     */
    socketOptions?: AmqpConnectionManagerSocketOptions;
    /**
     * If true, the broker won’t expect an acknowledgement of messages delivered to this consumer; i.e., it will dequeue messages as soon as they’ve been sent down the wire.
     * @default false
     */
    noAck?: boolean;
    /**
     * A name which the server will use to distinguish message deliveries for the consumer; mustn’t be already in use on the channel. It’s usually easier to omit this, in which case the server will create a random name and supply it in the reply.
     */
    consumerTag?: string;
    /**
     * A serializer for the message payload.
     */
    serializer?: Serializer;
    /**
     * A deserializer for the message payload.
     */
    deserializer?: Deserializer;
    /**
     * A reply queue for the producer.
     * @default 'amq.rabbitmq.reply-to'
     */
    replyQueue?: string;
    /**
     * If truthy, the message will survive broker restarts provided it’s in a queue that also survives restarts.
     */
    persistent?: boolean;
    /**
     * Additional headers to be sent with every message.
     * Applies only to the producer configuration.
     */
    headers?: Record<string, string>;
    /**
     * When false, a queue will not be asserted before consuming.
     * @default false
     */
    noAssert?: boolean;
    /**
     * Name for the exchange. Defaults to the queue name when "wildcards" is set to true.
     * @default ''
     */
    exchange?: string;
    /**
     * Type of the exchange.
     * Accepts the AMQP standard types ('direct', 'fanout', 'topic', 'headers') or any custom exchange type name provided as a string literal.
     * @default 'topic'
     */
    exchangeType?: 'direct' | 'fanout' | 'topic' | 'headers' | (string & {});
    /**
     * Exchange arguments
     */
    exchangeArguments?: Record<string, string>;
    /**
     * Additional routing key for the topic exchange.
     */
    routingKey?: string;
    /**
     * Set to true only if you want to use Topic Exchange for routing messages to queues.
     * Enabling this will allow you to use wildcards (*, #) as message and event patterns.
     * @see https://www.rabbitmq.com/tutorials/tutorial-five-python#topic-exchange
     * @default false
     */
    wildcards?: boolean;
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
