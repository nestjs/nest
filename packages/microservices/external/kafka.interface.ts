/**
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/kafkajs/index.d.ts
 */
import * as net from 'net';
import * as tls from 'tls';

export declare class Kafka {
  constructor(config: KafkaConfig);
  producer(config?: ProducerConfig): Producer;
  consumer(config?: ConsumerConfig): Consumer;
  admin(config?: AdminConfig): Admin;
  logger(): Logger;
}

export type BrokersFunction = () => string[] | Promise<string[]>;

export interface KafkaConfig {
  brokers: string[] | BrokersFunction;
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

export interface SASLOptions {
  mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws';
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
export type DefaultPartitioner = (args: PartitionerArgs) => number;
export type JavaCompatiblePartitioner = (args: PartitionerArgs) => number;

export let Partitioners: {
  DefaultPartitioner: DefaultPartitioner;
  JavaCompatiblePartitioner: JavaCompatiblePartitioner;
};

export interface PartitionMetadata {
  partitionErrorCode: number;
  partitionId: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface IHeaders {
  [key: string]: Buffer;
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
  retry?: RetryOptions;
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
  readUncommitted?: boolean;
}

export interface PartitionAssigner {
  new (config: { cluster: Cluster }): Assigner;
}

export interface CoordinatorMetadata {
  errorCode: number;
  coordinator: {
    nodeId: number;
    host: string;
    port: number;
  };
}

export interface Cluster {
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
    topics: Array<{
      topic: string;
      partitions: Array<{ partition: number }>;
      fromBeginning: boolean;
    }>,
  ): Promise<{
    topic: string;
    partitions: Array<{ partition: number; offset: string }>;
  }>;
}

export interface Assignment {
  [topic: string]: number[];
}

export interface GroupMember {
  memberId: string;
  memberMetadata: MemberMetadata;
}

export interface GroupMemberAssignment {
  memberId: string;
  memberAssignment: Buffer;
}

export interface GroupState {
  name: string;
  metadata: Buffer;
}

export interface Assigner {
  name: string;
  version: number;
  assign(group: {
    members: GroupMember[];
    topics: string[];
    userData: Buffer;
  }): Promise<GroupMemberAssignment[]>;
  protocol(subscription: { topics: string[]; userData: Buffer }): GroupState;
}

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

export interface ITopicMetadata {
  name: string;
  partitions: PartitionMetadata[];
}

export enum ResourceType {
  UNKNOWN = 0,
  ANY = 1,
  TOPIC = 2,
  GROUP = 3,
  CLUSTER = 4,
  TRANSACTIONAL_ID = 5,
  DELEGATION_TOKEN = 6,
}

export interface ResourceConfigQuery {
  type: ResourceType;
  name: string;
  configNames: string[];
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
    resourceType: ResourceType;
  }[];
  throttleTime: number;
}

export interface IResourceConfig {
  type: ResourceType;
  name: string;
  configEntries: { name: string; value: string }[];
}

type ValueOf<T> = T[keyof T];

export interface AdminEvents {
  CONNECT: 'admin.connect';
  DISCONNECT: 'admin.disconnect';
  REQUEST: 'admin.network.request';
  REQUEST_TIMEOUT: 'admin.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'admin.network.request_queue_size';
}

export interface InstrumentationEvent<T> {
  id: string;
  type: string;
  timestamp: number;
  payload: T;
}

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

export interface Admin {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createTopics(options: {
    validateOnly?: boolean;
    waitForLeaders?: boolean;
    timeout?: number;
    topics: ITopicConfig[];
  }): Promise<boolean>;
  deleteTopics(options: { topics: string[]; timeout?: number }): Promise<void>;
  fetchTopicMetadata(options: {
    topics: string[];
  }): Promise<{ topics: Array<ITopicMetadata> }>;
  fetchOffsets(options: {
    groupId: string;
    topic: string;
  }): Promise<
    Array<{ partition: number; offset: string; metadata: string | null }>
  >;
  fetchTopicOffsets(
    topic: string,
  ): Promise<
    Array<{ partition: number; offset: string; high: string; low: string }>
  >;
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
  logger(): Logger;
  on(eventName: ValueOf<AdminEvents>, listener: (...args: any[]) => void): void;
  events: AdminEvents;
}

export let PartitionAssigners: { roundRobin: PartitionAssigner };

export interface ISerializer<T> {
  encode(value: T): Buffer;
  decode(buffer: Buffer): T;
}

export interface MemberMetadata {
  version: number;
  topics: string[];
  userData: Buffer;
}

export interface MemberAssignment {
  version: number;
  assignment: Assignment;
  userData: Buffer;
}

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

export type Logger = (entry: LogEntry) => void;

export type logCreator = (logLevel: string) => (entry: LogEntry) => void;

export interface Broker {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  apiVersions(): Promise<{
    [apiKey: number]: { minVersion: number; maxVersion: number };
  }>;
  metadata(
    topics: string[],
  ): Promise<{
    brokers: Array<{ nodeId: number; host: string; port: number }>;
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
}

export interface KafkaMessage {
  key: Buffer;
  value: Buffer;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
  headers?: IHeaders;
}

export interface ProducerRecord {
  topic: string;
  messages: Message[];
  acks?: number;
  timeout?: number;
  compression?: CompressionTypes;
}

export interface RecordMetadata {
  topicName: string;
  partition: number;
  errorCode: number;
  offset: string;
  timestamp: string;
}

export interface TopicMessages {
  topic: string;
  messages: Message[];
}

export interface ProducerBatch {
  acks: number;
  timeout: number;
  compression: CompressionTypes;
  topicMessages: TopicMessages[];
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

interface Sender {
  send(record: ProducerRecord): Promise<RecordMetadata[]>;
  sendBatch(batch: ProducerBatch): Promise<RecordMetadata[]>;
}

export interface ProducerEvents {
  CONNECT: 'producer.connect';
  DISCONNECT: 'producer.disconnect';
  REQUEST: 'producer.network.request';
  REQUEST_TIMEOUT: 'producer.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size';
}

export type Producer = Sender & {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isIdempotent(): boolean;
  events: ProducerEvents;
  on(
    eventName: ValueOf<ProducerEvents>,
    listener: (...args: any[]) => void,
  ): void;
  transaction(): Promise<Transaction>;
  logger(): Logger;
};

export type Transaction = Sender & {
  sendOffsets(offsets: Offsets & { consumerGroupId: string }): Promise<void>;
  commit(): Promise<void>;
  abort(): Promise<void>;
  isActive(): boolean;
};

export interface ConsumerGroup {
  groupId: string;
  generationId: number;
  memberId: string;
  coordinator: Broker;
}

export interface MemberDescription {
  clientHost: string;
  clientId: string;
  memberId: string;
  memberAssignment: Buffer;
  memberMetadata: Buffer;
}

export interface GroupDescription {
  groupId: string;
  members: MemberDescription[];
  protocol: string;
  protocolType: string;
  state: string;
}

export interface TopicPartitions {
  topic: string;
  partitions: number[];
}
export interface TopicPartitionOffsetAndMedata {
  topic: string;
  partition: number;
  offset: string;
  metadata?: string | null;
}

export interface Batch {
  topic: string;
  partition: number;
  highWatermark: string;
  messages: KafkaMessage[];
  isEmpty(): boolean;
  firstOffset(): string | null;
  lastOffset(): string;
  offsetLag(): string;
  offsetLagLow(): string;
}

export interface ConsumerEvents {
  HEARTBEAT: 'consumer.heartbeat';
  COMMIT_OFFSETS: 'consumer.commit_offsets';
  GROUP_JOIN: 'consumer.group_join';
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
}
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
  uncommittedOffsets(): Promise<OffsetsByTopicPartition>;
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

export interface Consumer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topic: {
    topic: string | RegExp;
    fromBeginning?: boolean;
  }): Promise<void>;
  stop(): Promise<void>;
  run(config?: {
    autoCommit?: boolean;
    autoCommitInterval?: number | null;
    autoCommitThreshold?: number | null;
    eachBatchAutoResolve?: boolean;
    partitionsConsumedConcurrently?: number;
    eachBatch?: (payload: EachBatchPayload) => Promise<void>;
    eachMessage?: (payload: EachMessagePayload) => Promise<void>;
  }): Promise<void>;
  commitOffsets(
    topicPartitions: Array<TopicPartitionOffsetAndMedata>,
  ): Promise<void>;
  seek(topicPartition: {
    topic: string;
    partition: number;
    offset: string;
  }): void;
  describeGroup(): Promise<GroupDescription>;
  pause(topics: Array<{ topic: string; partitions?: number[] }>): void;
  resume(topics: Array<{ topic: string; partitions?: number[] }>): void;
  on(
    eventName: ValueOf<ConsumerEvents>,
    listener: (...args: any[]) => void,
  ): void;
  logger(): Logger;
  events: ConsumerEvents;
}

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
