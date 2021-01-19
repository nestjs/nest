import { Transport } from '../enums';
import { ChannelOptions } from '../external/grpc-options.interface';
import {
  ConsumerConfig,
  ConsumerRunConfig,
  ConsumerSubscribeTopic,
  KafkaConfig,
  ProducerConfig,
  ProducerRecord,
} from '../external/kafka.interface';
import { MqttClientOptions } from '../external/mqtt-options.interface';
import { ClientOpts } from '../external/redis.interface';
import { RmqUrl } from '../external/rmq-url.interface';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Deserializer } from './deserializer.interface';
import { Serializer } from './serializer.interface';
import {
  PubSubConfig,
  PublishConfig,
  SubscriberConfig,
} from '../external/gc-pubsub.interface';

export type MicroserviceOptions =
  | GrpcOptions
  | TcpOptions
  | RedisOptions
  | NatsOptions
  | MqttOptions
  | RmqOptions
  | KafkaOptions
  | GCPubSubOptions
  | CustomStrategy;

export interface CustomStrategy {
  strategy: CustomTransportStrategy;
  options?: {};
}

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
    protoPath: string | string[];
    package: string | string[];
    protoLoader?: string;
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

export interface TcpOptions {
  transport?: Transport.TCP;
  options?: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
    serializer?: Serializer;
    deserializer?: Deserializer;
  };
}

export interface RedisOptions {
  transport?: Transport.REDIS;
  options?: {
    url?: string;
    retryAttempts?: number;
    retryDelay?: number;
    serializer?: Serializer;
    deserializer?: Deserializer;
  } & ClientOpts;
}

export interface MqttOptions {
  transport?: Transport.MQTT;
  options?: MqttClientOptions & {
    url?: string;
    serializer?: Serializer;
    deserializer?: Deserializer;
  };
}

export interface NatsOptions {
  transport?: Transport.NATS;
  options?: {
    encoding?: string;
    url?: string;
    name?: string;
    user?: string;
    pass?: string;
    maxPingOut?: number;
    maxReconnectAttempts?: number;
    reconnectTimeWait?: number;
    reconnectJitter?: number;
    reconnectJitterTLS?: number;
    reconnectDelayHandler?: any;
    servers?: string[];
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
    [key: string]: any;
  };
}

export interface RmqOptions {
  transport?: Transport.RMQ;
  options?: {
    urls?: string[] | RmqUrl[];
    queue?: string;
    prefetchCount?: number;
    isGlobalPrefetchCount?: boolean;
    queueOptions?: any; // AmqplibQueueOptions;
    socketOptions?: any; // AmqpConnectionManagerSocketOptions;
    noAck?: boolean;
    serializer?: Serializer;
    deserializer?: Deserializer;
    replyQueue?: string;
    persistent?: boolean;
  };
}

export interface KafkaOptions {
  transport?: Transport.KAFKA;
  options?: {
    postfixId?: string;
    client?: KafkaConfig;
    consumer?: ConsumerConfig;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    subscribe?: Omit<ConsumerSubscribeTopic, 'topic'>;
    producer?: ProducerConfig;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    serializer?: Serializer;
    deserializer?: Deserializer;
  };
}

export interface GCPubSubOptions {
  transport?: Transport.GC_PUBSUB;
  options?: {
    client?: PubSubConfig;
    topic?: string;
    replyTopic?: string;
    subscription?: string;
    replySubscription?: string;
    publisher?: PublishConfig;
    subscriber?: SubscriberConfig;
    serializer?: Serializer;
    deserializer?: Deserializer;
  };
}
