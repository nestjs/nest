/**
 * Do NOT add NestJS logic to this interface. It is meant to ONLY represent the
 * types of the `@platformatic/kafka` package (2.x) that the Kafka transport
 * takes in its options or hands to application code. Keys, values and headers
 * are `Buffer`s: the transport serializes and deserializes them itself.
 *
 * @see https://github.com/platformatic/kafka/tree/main/src/clients
 *
 * @publicApi
 */

/// <reference types="node" />
import type { Readable } from 'stream';
import type { ConnectionOptions as TlsConnectionOptions } from 'tls';

export interface Broker {
  host: string;
  port: number;
}

export type CredentialProvider<T = string> = () => T | Promise<T>;

export type SASLMechanism =
  'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512' | 'OAUTHBEARER' | 'GSSAPI';

export interface SASLOptions {
  mechanism: SASLMechanism;
  username?: string | CredentialProvider;
  password?: string | CredentialProvider;
  token?: string | CredentialProvider;
  oauthBearerExtensions?:
    Record<string, string> | CredentialProvider<Record<string, string>>;
  reauthFraction?: number;
  reauthLeadTime?: number;
  lazyReauthentication?: boolean;
}

export interface KeepAliveOptions {
  initialDelay?: number;
  interval?: number;
  count?: number;
}

export interface ConnectionOptions {
  connectTimeout?: number;
  requestTimeout?: number;
  maxInflights?: number;
  keepAlive?: KeepAliveOptions;
  connectionsMaxIdle?: number;
  tls?: TlsConnectionOptions;
  tlsServerName?: string | boolean;
  sasl?: SASLOptions;
  handleBackPressure?: boolean;
}

export interface BaseOptions extends ConnectionOptions {
  clientId: string;
  clientRack?: string;
  bootstrapBrokers: Broker[] | string[];
  timeout?: number;
  retries?: number | boolean;
  retryDelay?: number;
  metadataMaxAge?: number;
  knownBrokersMaxAge?: number;
  maxAbsentKnownBrokers?: number;
  autocreateTopics?: boolean;
  strict?: boolean;
}

export interface ClusterPartitionMetadata {
  leader: number;
  leaderEpoch: number;
  replicas: number[];
  isr: number[];
  offlineReplicas: number[];
}

export interface ClusterTopicMetadata {
  id: string;
  partitions: ClusterPartitionMetadata[];
  partitionsCount: number;
  lastUpdate: number;
}

export interface ClusterMetadata {
  id: string;
  brokers: Map<number, Broker & { rack: string | null }>;
  controllerId: number;
  topics: Map<string, ClusterTopicMetadata>;
  lastUpdate: number;
}

export interface TopicWithPartitionAndOffset {
  topic: string;
  partition: number;
  offset: bigint;
}

export interface CommitOptionsPartition extends TopicWithPartitionAndOffset {
  leaderEpoch: number;
}

export interface CommitOptions {
  offsets: CommitOptionsPartition[];
}

export interface GroupProtocolSubscription {
  name: string;
  version: number;
  metadata?: Buffer | string;
}

export interface GroupAssignment {
  topic: string;
  partitions: number[];
}

export interface ExtendedGroupProtocolSubscription extends Omit<
  GroupProtocolSubscription,
  'name'
> {
  topics?: string[];
  ownedPartitions?: GroupAssignment[];
  generationId?: number;
  rackId?: string | null;
  memberId: string;
}

export interface GroupPartitionsAssignments {
  memberId: string;
  assignments: Map<string, GroupAssignment>;
}

export type GroupPartitionsAssigner = (
  current: string,
  members: Map<string, ExtendedGroupProtocolSubscription>,
  topics: Set<string>,
  metadata: ClusterMetadata,
) => GroupPartitionsAssignments[];

export type GroupProtocolsMetadataCallback = (
  protocols: GroupProtocolSubscription[],
  topics: string[],
  metadata: ClusterMetadata,
) => Buffer | Promise<Buffer>;

export interface GroupOptions {
  groupProtocol?: 'classic';
  groupInstanceId?: string;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  heartbeatStallTimeout?: number;
  protocols?: GroupProtocolSubscription[];
  protocolsMetadata?: GroupProtocolsMetadataCallback;
  partitionAssigner?: GroupPartitionsAssigner;
}

export interface ConsumerGroupOptions {
  groupProtocol: 'consumer';
  groupInstanceId?: string;
  groupRemoteAssignor?: string;
  rebalanceTimeout?: number;
  heartbeatStallTimeout?: number;
}

export interface ConsumeBaseOptions {
  minBytes?: number;
  maxBytes?: number;
  maxBytesPerPartition?: number;
  maxWaitTime?: number;
  isolationLevel?: number;
  highWaterMark?: number;
}

/** The options of a consumer, besides those of the base client. */
export type ConsumerOwnOptions = {
  groupId: string;
  leaveGroupTimeout?: number;
} & (GroupOptions | ConsumerGroupOptions) &
  ConsumeBaseOptions;

export type ConsumerOptions = BaseOptions & ConsumerOwnOptions;

export type MessagesStreamMode = 'latest' | 'earliest' | 'committed';

export type MessagesStreamFallbackMode = 'latest' | 'earliest' | 'fail';

export interface StreamOptions {
  topics: string[];
  mode?: MessagesStreamMode;
  fallbackMode?: MessagesStreamFallbackMode;
}

export interface ConsumeOptions extends StreamOptions {
  autocommit?: boolean | number;
}

/** The stream of messages that `Consumer#consume()` resolves to. */
export interface MessagesStream extends Readable {
  read(): Message | null;
  close(): Promise<void>;
}

export interface MessageToProduce {
  key?: Buffer;
  /** `null` writes a tombstone. */
  value: Buffer | null;
  topic: string;
  partition?: number;
  timestamp?: bigint;
  headers?: Map<Buffer, Buffer>;
}

/** A message as `@platformatic/kafka` delivers it. */
export interface Message {
  key: Buffer;
  value: Buffer;
  headers: Map<Buffer, Buffer>;
  headerEntries: Array<[Buffer, Buffer]>;
  topic: string;
  partition: number;
  timestamp: bigint;
  offset: bigint;
  leaderEpoch: number;
  commit(): void | Promise<void>;
}

export type CompressionAlgorithm = 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

export interface PartitionerContext {
  metadata: ClusterMetadata | undefined;
}

export type Partitioner = (
  message: MessageToProduce,
  key: Buffer | undefined,
  context: PartitionerContext,
) => number;

export interface ProduceOptions {
  producerId?: bigint;
  producerEpoch?: number;
  idempotent?: boolean;
  acks?: number;
  compression?: CompressionAlgorithm;
  partitioner?: Partitioner;
  autocreateTopics?: boolean;
  repeatOnStaleMetadata?: boolean;
}

export interface SendOptions extends ProduceOptions {
  messages: MessageToProduce[];
}

export interface ProduceResult {
  offsets?: TopicWithPartitionAndOffset[];
  unwritableNodes?: number[];
}

/** The `Consumer` of `@platformatic/kafka`. */
export interface Consumer {
  readonly groupId: string;
  readonly memberId: string | null;
  readonly generationId: number;
  readonly assignments: GroupAssignment[] | null;
  metadata(options: { topics: string[] }): Promise<ClusterMetadata>;
  consume(options: ConsumeOptions): Promise<MessagesStream>;
  commit(options: CommitOptions): Promise<void>;
  listOffsets(options: {
    topics: string[];
    partitions?: Record<string, number[]>;
    timestamp?: bigint;
  }): Promise<Map<string, bigint[]>>;
  listCommittedOffsets(options: {
    topics: GroupAssignment[];
  }): Promise<Map<string, bigint[]>>;
  getLag(options: {
    topics: string[];
    partitions?: Record<string, number[]>;
  }): Promise<Map<string, bigint[]>>;
  isActive(): boolean;
  close(force?: boolean): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): this;
}

/** The `Producer` of `@platformatic/kafka`. */
export interface Producer {
  readonly producerId: bigint | undefined;
  readonly producerEpoch: number | undefined;
  metadata(options: { topics: string[] }): Promise<ClusterMetadata>;
  send(options: SendOptions): Promise<ProduceResult>;
  close(force?: boolean): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): this;
}
