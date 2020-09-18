/// <reference types="node" />

import * as tls from 'tls';
import * as net from 'net';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

export declare class Kafka {
  constructor(config: KafkaConfig);
  producer(config?: ProducerConfig): Producer;
  consumer(config?: ConsumerConfig): Consumer;
  admin(config?: AdminConfig): Admin;
  logger(): Logger;
}

export interface KafkaConfig {
  brokers: string[];
  ssl?: tls.ConnectionOptions | boolean;
  sasl?: SASLOptions;
  clientId?: string;
  connectionTimeout?: number;
  authenticationTimeout?: number;
  reauthenticationThreshold?: number;
  requestTimeout?: number;
  enforceRequestTimeout?: boolean;
  retry?: RetryOptions;
  socketFactory?: ISocketFactory;
  logLevel?: logLevel;
  logCreator?: logCreator;
}

export type ISocketFactory = (
  host: string,
  port: number,
  ssl: tls.ConnectionOptions,
  onConnect: () => void,
) => net.Socket;

export type SASLMechanism = 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws';

export interface SASLOptions {
  mechanism: SASLMechanism;
  username: string;
  password: string;
}

export interface ProducerConfig {
  createPartitioner?: ICustomPartitioner;
  retry?: RetryOptions;
  metadataMaxAge?: number;
  allowAutoTopicCreation?: boolean;
  idempotent?: boolean;
  transactionalId?: string;
  transactionTimeout?: number;
  maxInFlightRequests?: number;
}

export interface Message {
  key?: Buffer | string | null;
  value: Buffer | string | null;
  partition?: number;
  headers?: IHeaders;
  timestamp?: string;
}

export interface PartitionerArgs {
  topic: string;
  partitionMetadata: PartitionMetadata[];
  message: Message;
}

export type ICustomPartitioner = () => (args: PartitionerArgs) => number;
export type DefaultPartitioner = ICustomPartitioner;
export type JavaCompatiblePartitioner = ICustomPartitioner;

export let Partitioners: {
  DefaultPartitioner: DefaultPartitioner;
  JavaCompatiblePartitioner: JavaCompatiblePartitioner;
};

export type PartitionMetadata = {
  partitionErrorCode: number;
  partitionId: number;
  leader: number;
  replicas: number[];
  isr: number[];
  offlineReplicas?: number[];
};

export interface IHeaders {
  [key: string]: Buffer | string;
}

export interface ConsumerConfig {
  groupId: string;
  partitionAssigners?: PartitionAssigner[];
  metadataMaxAge?: number;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  retry?: RetryOptions & {
    restartOnFailure?: (err: Error) => Promise<boolean>;
  };
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
  readUncommitted?: boolean;
  rackId?: string;
}

export type PartitionAssigner = (config: { cluster: Cluster }) => Assigner;

export interface CoordinatorMetadata {
  errorCode: number;
  coordinator: {
    nodeId: number;
    host: string;
    port: number;
  };
}

export type Cluster = {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  refreshMetadata(): Promise<void>;
  refreshMetadataIfNecessary(): Promise<void>;
  addTargetTopic(topic: string): Promise<void>;
  findBroker(node: { nodeId: string }): Promise<Broker>;
  findControllerBroker(): Promise<Broker>;
  findTopicPartitionMetadata(topic: string): PartitionMetadata[];
  findLeaderForPartitions(
    topic: string,
    partitions: number[],
  ): { [leader: string]: number[] };
  findGroupCoordinator(group: { groupId: string }): Promise<Broker>;
  findGroupCoordinatorMetadata(group: {
    groupId: string;
  }): Promise<CoordinatorMetadata>;
  defaultOffset(config: { fromBeginning: boolean }): number;
  fetchTopicsOffset(
    topics: Array<
      {
        topic: string;
        partitions: Array<{ partition: number }>;
      } & XOR<{ fromBeginning: boolean }, { fromTimestamp: number }>
    >,
  ): Promise<{
    topic: string;
    partitions: Array<{ partition: number; offset: string }>;
  }>;
};

export type Assignment = { [topic: string]: number[] };

export type GroupMember = { memberId: string; memberMetadata: Buffer };

export type GroupMemberAssignment = {
  memberId: string;
  memberAssignment: Buffer;
};

export type GroupState = { name: string; metadata: Buffer };

export type Assigner = {
  name: string;
  version: number;
  assign(group: {
    members: GroupMember[];
    topics: string[];
  }): Promise<GroupMemberAssignment[]>;
  protocol(subscription: { topics: string[] }): GroupState;
};

export interface RetryOptions {
  maxRetryTime?: number;
  initialRetryTime?: number;
  factor?: number;
  multiplier?: number;
  retries?: number;
}

export interface AdminConfig {
  retry?: RetryOptions;
}

export interface ITopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
  replicaAssignment?: object[];
  configEntries?: object[];
}

export interface ITopicPartitionConfig {
  topic: string;
  count: number;
  assignments?: Array<Array<number>>;
}

export interface ITopicMetadata {
  name: string;
  partitions: PartitionMetadata[];
}

export enum ResourceTypes {
  UNKNOWN = 0,
  ANY = 1,
  TOPIC = 2,
  GROUP = 3,
  CLUSTER = 4,
  TRANSACTIONAL_ID = 5,
  DELEGATION_TOKEN = 6,
}

export interface ResourceConfigQuery {
  type: ResourceTypes;
  name: string;
  configNames?: string[];
}

export interface ConfigEntries {
  configName: string;
  configValue: string;
  isDefault: boolean;
  isSensitive: boolean;
  readOnly: boolean;
  configSynonyms: ConfigSynonyms[];
}

export interface ConfigSynonyms {
  configName: string;
  configValue: string;
  configSource: number;
}

export interface DescribeConfigResponse {
  resources: {
    configEntries: ConfigEntries[];
    errorCode: number;
    errorMessage: string;
    resourceName: string;
    resourceType: ResourceTypes;
  }[];
  throttleTime: number;
}

export interface IResourceConfig {
  type: ResourceTypes;
  name: string;
  configEntries: { name: string; value: string }[];
}

type ValueOf<T> = T[keyof T];

export type AdminEvents = {
  CONNECT: 'admin.connect';
  DISCONNECT: 'admin.disconnect';
  REQUEST: 'admin.network.request';
  REQUEST_TIMEOUT: 'admin.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'admin.network.request_queue_size';
};

export interface InstrumentationEvent<T> {
  id: string;
  type: string;
  timestamp: number;
  payload: T;
}

export type RemoveInstrumentationEventListener<T> = () => void;

export type ConnectEvent = InstrumentationEvent<null>;
export type DisconnectEvent = InstrumentationEvent<null>;
export type RequestEvent = InstrumentationEvent<{
  apiKey: number;
  apiName: string;
  apiVersion: number;
  broker: string;
  clientId: string;
  correlationId: number;
  createdAt: number;
  duration: number;
  pendingDuration: number;
  sentAt: number;
  size: number;
}>;
export type RequestTimeoutEvent = InstrumentationEvent<{
  apiKey: number;
  apiName: string;
  apiVersion: number;
  broker: string;
  clientId: string;
  correlationId: number;
  createdAt: number;
  pendingDuration: number;
  sentAt: number;
}>;
export type RequestQueueSizeEvent = InstrumentationEvent<{
  broker: string;
  clientId: string;
  queueSize: number;
}>;

export interface SeekEntry {
  partition: number;
  offset: string;
}

export type Admin = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTopics(): Promise<string[]>;
  createTopics(options: {
    validateOnly?: boolean;
    waitForLeaders?: boolean;
    timeout?: number;
    topics: ITopicConfig[];
  }): Promise<boolean>;
  deleteTopics(options: { topics: string[]; timeout?: number }): Promise<void>;
  createPartitions(options: {
    validateOnly?: boolean;
    timeout?: number;
    topicPartitions: ITopicPartitionConfig[];
  }): Promise<boolean>;
  fetchTopicMetadata(options?: {
    topics: string[];
  }): Promise<{ topics: Array<ITopicMetadata> }>;
  fetchOffsets(options: {
    groupId: string;
    topic: string;
  }): Promise<Array<SeekEntry & { metadata: string | null }>>;
  fetchTopicOffsets(
    topic: string,
  ): Promise<Array<SeekEntry & { high: string; low: string }>>;
  fetchTopicOffsetsByTimestamp(
    topic: string,
    timestamp?: number,
  ): Promise<Array<SeekEntry>>;
  describeCluster(): Promise<{
    brokers: Array<{ nodeId: number; host: string; port: number }>;
    controller: number | null;
    clusterId: string;
  }>;
  setOffsets(options: {
    groupId: string;
    topic: string;
    partitions: SeekEntry[];
  }): Promise<void>;
  resetOffsets(options: {
    groupId: string;
    topic: string;
    earliest: boolean;
  }): Promise<void>;
  describeConfigs(configs: {
    resources: ResourceConfigQuery[];
    includeSynonyms: boolean;
  }): Promise<DescribeConfigResponse>;
  alterConfigs(configs: {
    validateOnly: boolean;
    resources: IResourceConfig[];
  }): Promise<any>;
  listGroups(): Promise<{ groups: GroupOverview[] }>;
  deleteGroups(groupIds: string[]): Promise<DeleteGroupsResult[]>;
  describeGroups(groupIds: string[]): Promise<GroupDescriptions>;
  logger(): Logger;
  on(
    eventName: ValueOf<AdminEvents>,
    listener: (...args: any[]) => void,
  ): RemoveInstrumentationEventListener<typeof eventName>;
  events: AdminEvents;
};

export let PartitionAssigners: { roundRobin: PartitionAssigner };

export interface ISerializer<T> {
  encode(value: T): Buffer;
  decode(buffer: Buffer): T | null;
}

export type MemberMetadata = {
  version: number;
  topics: string[];
  userData: Buffer;
};

export type MemberAssignment = {
  version: number;
  assignment: Assignment;
  userData: Buffer;
};

export let AssignerProtocol: {
  MemberMetadata: ISerializer<MemberMetadata>;
  MemberAssignment: ISerializer<MemberAssignment>;
};

export enum logLevel {
  NOTHING = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 4,
  DEBUG = 5,
}

export interface LogEntry {
  namespace: string;
  level: logLevel;
  label: string;
  log: LoggerEntryContent;
}

export interface LoggerEntryContent {
  readonly timestamp: Date;
  readonly message: string;
  [key: string]: any;
}

export type logCreator = (logLevel: logLevel) => (entry: LogEntry) => void;

export type Logger = {
  info: (message: string, extra?: object) => void;
  error: (message: string, extra?: object) => void;
  warn: (message: string, extra?: object) => void;
  debug: (message: string, extra?: object) => void;
};

export type Broker = {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  apiVersions(): Promise<{
    [apiKey: number]: { minVersion: number; maxVersion: number };
  }>;
  metadata(
    topics: string[],
  ): Promise<{
    brokers: Array<{
      nodeId: number;
      host: string;
      port: number;
      rack?: string;
    }>;
    topicMetadata: Array<{
      topicErrorCode: number;
      topic: number;
      partitionMetadata: PartitionMetadata[];
    }>;
  }>;
  offsetCommit(request: {
    groupId: string;
    groupGenerationId: number;
    memberId: string;
    retentionTime?: number;
    topics: Array<{
      topic: string;
      partitions: Array<{ partition: number; offset: string }>;
    }>;
  }): Promise<any>;
  fetch(request: {
    replicaId?: number;
    isolationLevel?: number;
    maxWaitTime?: number;
    minBytes?: number;
    maxBytes?: number;
    topics: Array<{
      topic: string;
      partitions: Array<{
        partition: number;
        fetchOffset: string;
        maxBytes: number;
      }>;
    }>;
    rackId?: string;
  }): Promise<any>;
};

export type KafkaMessage = {
  key: Buffer;
  value: Buffer | null;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
  headers?: IHeaders;
};

export interface ProducerRecord {
  topic: string;
  messages: Message[];
  acks?: number;
  timeout?: number;
  compression?: CompressionTypes;
}

export type RecordMetadata = {
  topicName: string;
  partition: number;
  errorCode: number;
  offset: string;
  timestamp: string;
};

export interface TopicMessages {
  topic: string;
  messages: Message[];
}

export interface ProducerBatch {
  acks?: number;
  timeout?: number;
  compression?: CompressionTypes;
  topicMessages?: TopicMessages[];
}

export interface PartitionOffset {
  partition: number;
  offset: string;
}

export interface TopicOffsets {
  topic: string;
  partitions: PartitionOffset[];
}

export interface Offsets {
  topics: TopicOffsets[];
}

type Sender = {
  send(record: ProducerRecord): Promise<RecordMetadata[]>;
  sendBatch(batch: ProducerBatch): Promise<RecordMetadata[]>;
};

export type ProducerEvents = {
  CONNECT: 'producer.connect';
  DISCONNECT: 'producer.disconnect';
  REQUEST: 'producer.network.request';
  REQUEST_TIMEOUT: 'producer.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size';
};

export type Producer = Sender & {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isIdempotent(): boolean;
  events: ProducerEvents;
  on(
    eventName: ValueOf<ProducerEvents>,
    listener: (...args: any[]) => void,
  ): RemoveInstrumentationEventListener<typeof eventName>;
  transaction(): Promise<Transaction>;
  logger(): Logger;
};

export type Transaction = Sender & {
  sendOffsets(offsets: Offsets & { consumerGroupId: string }): Promise<void>;
  commit(): Promise<void>;
  abort(): Promise<void>;
  isActive(): boolean;
};

export type ConsumerGroup = {
  groupId: string;
  generationId: number;
  memberId: string;
  coordinator: Broker;
};

export type MemberDescription = {
  clientHost: string;
  clientId: string;
  memberId: string;
  memberAssignment: Buffer;
  memberMetadata: Buffer;
};

export type GroupDescription = {
  groupId: string;
  members: MemberDescription[];
  protocol: string;
  protocolType: string;
  state: string;
};

export type GroupDescriptions = {
  groups: GroupDescription[];
};

export type TopicPartitions = { topic: string; partitions: number[] };
export type TopicPartitionOffsetAndMetadata = {
  topic: string;
  partition: number;
  offset: string;
  metadata?: string | null;
};

// TODO: Remove with 2.x
export type TopicPartitionOffsetAndMedata = TopicPartitionOffsetAndMetadata;

export type Batch = {
  topic: string;
  partition: number;
  highWatermark: string;
  messages: KafkaMessage[];
  isEmpty(): boolean;
  firstOffset(): string | null;
  lastOffset(): string;
  offsetLag(): string;
  offsetLagLow(): string;
};

export type GroupOverview = {
  groupId: string;
  protocolType: string;
};

export type DeleteGroupsResult = {
  groupId: string;
  errorCode?: number;
};

export type ConsumerEvents = {
  HEARTBEAT: 'consumer.heartbeat';
  COMMIT_OFFSETS: 'consumer.commit_offsets';
  GROUP_JOIN: 'consumer.group_join';
  FETCH_START: 'consumer.fetch_start';
  FETCH: 'consumer.fetch';
  START_BATCH_PROCESS: 'consumer.start_batch_process';
  END_BATCH_PROCESS: 'consumer.end_batch_process';
  CONNECT: 'consumer.connect';
  DISCONNECT: 'consumer.disconnect';
  STOP: 'consumer.stop';
  CRASH: 'consumer.crash';
  REQUEST: 'consumer.network.request';
  REQUEST_TIMEOUT: 'consumer.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size';
};
export type ConsumerHeartbeatEvent = InstrumentationEvent<{
  groupId: string;
  memberId: string;
  groupGenerationId: number;
}>;
export type ConsumerCommitOffsetsEvent = InstrumentationEvent<{
  groupId: string;
  memberId: string;
  groupGenerationId: number;
  topics: {
    topic: string;
    partitions: {
      offset: string;
      partition: string;
    }[];
  }[];
}>;
export interface IMemberAssignment {
  [key: string]: number[];
}
export type ConsumerGroupJoinEvent = InstrumentationEvent<{
  duration: number;
  groupId: string;
  isLeader: boolean;
  leaderId: string;
  groupProtocol: string;
  memberId: string;
  memberAssignment: IMemberAssignment;
}>;
export type ConsumerFetchEvent = InstrumentationEvent<{
  numberOfBatches: number;
  duration: number;
}>;
interface IBatchProcessEvent {
  topic: string;
  partition: number;
  highWatermark: string;
  offsetLag: string;
  offsetLagLow: string;
  batchSize: number;
  firstOffset: string;
  lastOffset: string;
}
export type ConsumerStartBatchProcessEvent = InstrumentationEvent<
  IBatchProcessEvent
>;
export type ConsumerEndBatchProcessEvent = InstrumentationEvent<
  IBatchProcessEvent & { duration: number }
>;
export type ConsumerCrashEvent = InstrumentationEvent<{
  error: Error;
  groupId: string;
}>;

export interface OffsetsByTopicPartition {
  topics: TopicOffsets[];
}

export interface EachMessagePayload {
  topic: string;
  partition: number;
  message: KafkaMessage;
}

export interface EachBatchPayload {
  batch: Batch;
  resolveOffset(offset: string): void;
  heartbeat(): Promise<void>;
  commitOffsetsIfNecessary(offsets?: Offsets): Promise<void>;
  uncommittedOffsets(): OffsetsByTopicPartition;
  isRunning(): boolean;
  isStale(): boolean;
}

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L321-L325
 */
export type ConsumerEachMessagePayload = EachMessagePayload;

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L327-L336
 */
export type ConsumerEachBatchPayload = EachBatchPayload;

export type ConsumerRunConfig = {
  autoCommit?: boolean;
  autoCommitInterval?: number | null;
  autoCommitThreshold?: number | null;
  eachBatchAutoResolve?: boolean;
  partitionsConsumedConcurrently?: number;
  eachBatch?: (payload: EachBatchPayload) => Promise<void>;
  eachMessage?: (payload: EachMessagePayload) => Promise<void>;
};

export type ConsumerSubscribeTopic = {
  topic: string | RegExp;
  fromBeginning?: boolean;
};

export type Consumer = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topic: ConsumerSubscribeTopic): Promise<void>;
  stop(): Promise<void>;
  run(config?: ConsumerRunConfig): Promise<void>;
  commitOffsets(
    topicPartitions: Array<TopicPartitionOffsetAndMetadata>,
  ): Promise<void>;
  seek(topicPartition: {
    topic: string;
    partition: number;
    offset: string;
  }): void;
  describeGroup(): Promise<GroupDescription>;
  pause(topics: Array<{ topic: string; partitions?: number[] }>): void;
  paused(): TopicPartitions[];
  resume(topics: Array<{ topic: string; partitions?: number[] }>): void;
  on(
    eventName: ValueOf<ConsumerEvents>,
    listener: (...args: any[]) => void,
  ): RemoveInstrumentationEventListener<typeof eventName>;
  logger(): Logger;
  events: ConsumerEvents;
};

export enum CompressionTypes {
  None = 0,
  GZIP = 1,
  Snappy = 2,
  LZ4 = 3,
  ZSTD = 4,
}

export let CompressionCodecs: {
  [CompressionTypes.GZIP]: () => any;
  [CompressionTypes.Snappy]: () => any;
  [CompressionTypes.LZ4]: () => any;
  [CompressionTypes.ZSTD]: () => any;
};

export declare class KafkaJSError extends Error {
  constructor(e: Error | string, metadata?: KafkaJSErrorMetadata);
}

export declare class KafkaJSNonRetriableError extends KafkaJSError {
  constructor(e: Error | string);
}

export declare class KafkaJSProtocolError extends KafkaJSError {
  constructor(e: Error | string);
}

export declare class KafkaJSOffsetOutOfRange extends KafkaJSProtocolError {
  constructor(e: Error | string, metadata?: KafkaJSOffsetOutOfRangeMetadata);
}

export declare class KafkaJSNumberOfRetriesExceeded extends KafkaJSNonRetriableError {
  constructor(
    e: Error | string,
    metadata?: KafkaJSNumberOfRetriesExceededMetadata,
  );
}

export declare class KafkaJSConnectionError extends KafkaJSError {
  constructor(e: Error | string, metadata?: KafkaJSConnectionErrorMetadata);
}

export declare class KafkaJSRequestTimeoutError extends KafkaJSError {
  constructor(e: Error | string, metadata?: KafkaJSRequestTimeoutErrorMetadata);
}

export declare class KafkaJSMetadataNotLoaded extends KafkaJSError {
  constructor();
}

export declare class KafkaJSTopicMetadataNotLoaded extends KafkaJSMetadataNotLoaded {
  constructor(
    e: Error | string,
    metadata?: KafkaJSTopicMetadataNotLoadedMetadata,
  );
}

export declare class KafkaJSStaleTopicMetadataAssignment extends KafkaJSError {
  constructor(
    e: Error | string,
    metadata?: KafkaJSStaleTopicMetadataAssignmentMetadata,
  );
}

export declare class KafkaJSServerDoesNotSupportApiKey extends KafkaJSNonRetriableError {
  constructor(
    e: Error | string,
    metadata?: KafkaJSServerDoesNotSupportApiKeyMetadata,
  );
}

export declare class KafkaJSBrokerNotFound extends KafkaJSError {
  constructor();
}

export declare class KafkaJSPartialMessageError extends KafkaJSError {
  constructor();
}

export declare class KafkaJSSASLAuthenticationError extends KafkaJSError {
  constructor();
}

export declare class KafkaJSGroupCoordinatorNotFound extends KafkaJSError {
  constructor();
}

export declare class KafkaJSNotImplemented extends KafkaJSError {
  constructor();
}

export declare class KafkaJSTimeout extends KafkaJSError {
  constructor();
}

export declare class KafkaJSLockTimeout extends KafkaJSError {
  constructor();
}

export declare class KafkaJSUnsupportedMagicByteInMessageSet extends KafkaJSError {
  constructor();
}

export declare class KafkaJSDeleteGroupsError extends KafkaJSError {
  constructor(e: Error | string, groups?: KafkaJSDeleteGroupsErrorGroups[]);
}

export interface KafkaJSDeleteGroupsErrorGroups {
  groupId: string;
  errorCode: number;
  error: KafkaJSError;
}

export interface KafkaJSErrorMetadata {
  retriable?: boolean;
  topic?: string;
  partitionId?: number;
  metadata?: PartitionMetadata;
}

export interface KafkaJSOffsetOutOfRangeMetadata {
  topic: string;
  partition: number;
}

export interface KafkaJSNumberOfRetriesExceededMetadata {
  retryCount: number;
  retryTime: number;
}

export interface KafkaJSConnectionErrorMetadata {
  broker?: string;
  code?: string;
}

export interface KafkaJSRequestTimeoutErrorMetadata {
  broker: string;
  clientId: string;
  correlationId: number;
  createdAt: number;
  sentAt: number;
  pendingDuration: number;
}

export interface KafkaJSTopicMetadataNotLoadedMetadata {
  topic: string;
}

export interface KafkaJSStaleTopicMetadataAssignmentMetadata {
  topic: string;
  unknownPartitions: PartitionMetadata[];
}

export interface KafkaJSServerDoesNotSupportApiKeyMetadata {
  apiKey: number;
  apiName: string;
}
