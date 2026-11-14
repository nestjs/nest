/**
 * Do NOT add NestJS logic to this interface.  It is meant to ONLY represent the types for the @cookiemonsterdev/kafka-core package.
 *
 * @see https://github.com/cookieMonsterDev/kafka/tree/master/packages/core
 *
 * @publicApi
 *
 */

/// <reference types="node" />
import * as net from 'net';
import * as tls from 'tls';

type ValueOf<T> = T[keyof T];

export declare class Kafka {
  /**
   * Options left unset are filled from a `kafka.config.*` file, as set by
   * {@link KafkaConfig.config}.
   */
  constructor(config?: KafkaConfig);
  producer(config?: ProducerConfig): Producer;
  consumer(config: ConsumerConfig): Consumer;
  admin(config?: AdminConfig): Admin;
  logger(): Logger;
  /**
   * Reports where each `KafkaConfig` key's value came from: the call, a
   * `kafka.config.*` file, or neither (the default). Carries no values.
   */
  configSource(): KafkaConfigSource;
  /**
   * Async sibling of `new Kafka()`, and the recommended way to build a client
   * from a `kafka.config.*` file: it loads any config file with dynamic
   * `import()`, including one that uses top-level `await`.
   */
  static fromConfig(
    overrides?: KafkaConfig,
    options?: { cwd?: string },
  ): Promise<Kafka>;
  /**
   * Builds a client from a `kafka.config.*` file the caller already loaded,
   * without discovering or reading the file again.
   */
  static from(fileConfig: KafkaFileConfig, overrides?: KafkaConfig): Kafka;
}

/** Resolves bootstrap brokers at connect time as `host:port` strings. */
export type BrokersFunction = () =>
  readonly string[] | Promise<readonly string[]>;

export interface AuthenticationProviderArgs {
  host: string;
  port: number;
  logger: Logger;
  saslAuthenticate: <Decoded, ParseResult = Decoded>(args: {
    request: {
      encode(): Buffer | Promise<Buffer>;
    };
    response?: {
      decode(rawResponse: Buffer): Promise<Decoded>;
      parse(data: Decoded): Promise<ParseResult>;
    };
  }) => Promise<ParseResult | undefined>;
}

export interface SaslAuthenticationProvider {
  authenticate(): Promise<void>;
}

/** Custom SASL mechanism with a user-supplied authenticator. */
export type SaslMechanismProvider = {
  mechanism: string;
  authenticationProvider: (
    args: AuthenticationProviderArgs,
  ) => SaslAuthenticationProvider;
};

export interface OauthbearerProviderResponse {
  value: string;
}

/**
 * SASL/SCRAM password login, or delegation-token login (KIP-48), where
 * `tokenId` is the username and `tokenHmac` the password.
 */
export type ScramSaslOptions =
  | { username: string; password: string }
  | { tokenId: string; tokenHmac: Buffer | string };

/** One GSS/RFC 4752 round presented to a {@link GssTokenProvider}. */
export interface GssTokenChallenge {
  /** Broker token from the previous round, or `null` on the first call. */
  serverToken: Buffer | null;
  host: string;
  port: number;
  serviceName: string;
  principal?: string;
}

export interface GssTokenStep {
  token: Buffer;
  /** When true, this token is the last the client sends. */
  complete: boolean;
}

export type GssTokenProvider = (
  challenge: GssTokenChallenge,
) => Promise<GssTokenStep>;

type SaslMechanismOptionsMap = {
  plain: { username: string; password: string };
  'scram-sha-256': ScramSaslOptions;
  'scram-sha-512': ScramSaslOptions;
  aws: {
    authorizationIdentity: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  oauthbearer: {
    oauthBearerProvider: () => Promise<OauthbearerProviderResponse>;
  };
  /**
   * SASL/GSSAPI (Kerberos). Supply `gssProvider` or install the optional
   * `kerberos` package. `serviceName` defaults to `kafka`.
   */
  gssapi: {
    serviceName?: string;
    principal?: string;
    keytab?: string;
    krb5?: string;
    authorizationIdentity?: string;
    gssProvider?: GssTokenProvider;
  };
};

export type SaslMechanism = keyof SaslMechanismOptionsMap;
type SaslMechanismOptions<T> = T extends SaslMechanism
  ? { mechanism: T } & SaslMechanismOptionsMap[T]
  : never;
export type SaslOptions = SaslMechanismOptions<SaslMechanism>;
export type SASLOptions = SaslOptions;

export interface SocketFactoryArgs {
  host: string;
  port: number;
  ssl?: tls.ConnectionOptions | null;
  onConnect: () => void;
  /** TLS SNI when `host` is an IP (the original broker hostname). */
  servername?: string;
}

export type SocketFactory = (args: SocketFactoryArgs) => net.Socket;

/** How bootstrap hostnames are resolved before a TCP/TLS connect. */
export type ClientDnsLookup = 'useAllDnsIps' | 'canonicalBootstrap';

export type MetadataRecovery = 'rebootstrap' | 'none';

export interface RetryOptions {
  maxRetryTime?: number;
  initialRetryTime?: number;
  factor?: number;
  multiplier?: number;
  retries?: number;
}

export type ConsumerRetryOptions = RetryOptions & {
  restartOnFailure?: (error: Error) => Promise<boolean>;
};

export type KafkaMetricAttributes = Record<
  string,
  string | number | boolean | undefined
>;

export interface KafkaCounter {
  add(value: number, attributes?: KafkaMetricAttributes): void;
}

export interface KafkaHistogram {
  record(value: number, attributes?: KafkaMetricAttributes): void;
}

export interface KafkaUpDownCounter {
  add(value: number, attributes?: KafkaMetricAttributes): void;
}

/** Subset of the OpenTelemetry `Meter` API. */
export interface KafkaMeter {
  createCounter(
    name: string,
    options?: { description?: string; unit?: string },
  ): KafkaCounter;
  createHistogram(
    name: string,
    options?: { description?: string; unit?: string },
  ): KafkaHistogram;
  createUpDownCounter(
    name: string,
    options?: { description?: string; unit?: string },
  ): KafkaUpDownCounter;
}

export interface KafkaMetricsConfig {
  meter: KafkaMeter;
}

/** `true` loads the global OpenTelemetry meter; `{ meter }` supplies one. */
export type KafkaMetrics = boolean | KafkaMetricsConfig;

export interface ConnectOptions {
  signal?: AbortSignal;
}

export interface KafkaConfig {
  /**
   * Bootstrap servers as `host:port`, or a function that returns them.
   * Optional only because a `kafka.config.*` file can supply it instead; if
   * neither resolves brokers, the constructor throws.
   */
  brokers?: readonly string[] | BrokersFunction;
  ssl?: tls.ConnectionOptions | boolean;
  sasl?: SaslOptions | SaslMechanismProvider;
  clientId?: string;
  connectionTimeout?: number;
  /**
   * Close idle broker sockets after this many milliseconds. Default 540_000.
   * `0` disables idle close.
   */
  connectionsMaxIdleMs?: number;
  socketConnectionSetupTimeoutMaxMs?: number;
  clientDnsLookup?: ClientDnsLookup;
  reconnectBackoffMs?: number;
  reconnectBackoffMaxMs?: number;
  authenticationTimeout?: number;
  reauthenticationThreshold?: number;
  requestTimeout?: number;
  enforceRequestTimeout?: boolean;
  /**
   * KIP-1102: `'rebootstrap'` (the default) reconnects to the original
   * bootstrap brokers once the known brokers are exhausted; `'none'` keeps
   * retrying the known brokers.
   */
  metadataRecovery?: MetadataRecovery;
  retry?: RetryOptions;
  socketFactory?: SocketFactory;
  logLevel?: LogLevel;
  logCreator?: LogCreator;
  /** Client-side metrics. Off by default. */
  metrics?: KafkaMetrics;
  /** KIP-714: push client metrics to the broker. Default true. */
  enableMetricsPush?: boolean;
  /**
   * Whether `new Kafka()` reads a `kafka.config.*` file. Omitted (the
   * default): discover only when {@link KafkaConfig.brokers} is absent, so a
   * call that already passes `brokers` never touches the filesystem. `true`:
   * always discover and merge the file under whatever options this call
   * passes. `false`: never discover. A string: an explicit path, resolved
   * against `cwd` — a path that does not exist is a hard error, never a silent
   * fallback.
   *
   * `new Kafka()` loads the file synchronously: a `kafka.config.json`
   * silently, a TS/JS file with a one-time `config.sync-load-deprecated`
   * warning, since that sync path is deprecated. Prefer
   * `await Kafka.fromConfig()`, which loads any config file asynchronously.
   */
  config?: boolean | string;
}

export interface ProducerConfig {
  createPartitioner?: CustomPartitioner;
  retry?: RetryOptions;
  metadataMaxAge?: number;
  allowAutoTopicCreation?: boolean;
  /** Defaults to false. */
  idempotent?: boolean;
  transactionalId?: string;
  transactionTimeout?: number;
  /** Default 5. `null` uncaps in-flight requests. */
  maxInFlightRequests?: number | null;
  /** Default acks for `send`/`sendBatch` calls that omit `acks`. */
  acks?: number;
  /** Default compression for `send`/`sendBatch` calls that omit it. */
  compression?: CompressionTypes;
  compressionLevel?: number;
  /**
   * Delay in ms to wait for more records before sending a Produce request.
   * Default 5. `0` sends immediately (one Produce per `send()`).
   */
  lingerMs?: number;
  /**
   * Flush threshold, in record key and value bytes, for the linger buffer,
   * counted across all topics and partitions. Ignored when `lingerMs` is 0.
   * Default 16384; `0` does not flush by size.
   */
  batchSize?: number;
  /**
   * Max bytes of linger-buffered records waiting to be sent. Unset or 0 means
   * unlimited.
   */
  bufferMemory?: number;
  /**
   * End-to-end deadline for one `send`/`sendBatch` call, across `lingerMs`,
   * any `bufferMemory` wait and every retry; the call then rejects with
   * `KafkaDeliveryTimeoutError`. Default 120_000; 0 disables it.
   */
  deliveryTimeoutMs?: number;
  /**
   * Cap, in bytes, on the uncompressed records of one Produce request. A
   * larger record rejects with `KafkaMessageTooLargeError`. Default 1_048_576.
   */
  maxRequestSize?: number;
  hooks?: ProducerHooks;
}

export type HeaderValue = Buffer | string | null;

export interface RecordHeaders {
  [key: string]: HeaderValue | HeaderValue[];
}

export type IHeaders = RecordHeaders;

export interface Message {
  key?: Buffer | string | null;
  value: Buffer | string | null;
  partition?: number;
  headers?: RecordHeaders;
  /** Milliseconds since epoch. Defaults to the time the message is sent. */
  timestamp?: number;
}

export interface NodeLatencyReader {
  latencyFor(nodeId: number): number | undefined;
}

export interface PartitionerArgs {
  topic: string;
  partitionMetadata: readonly PartitionMetadata[];
  message: Message;
  nodeLatency?: NodeLatencyReader;
}

export interface PartitionerBatchArgs {
  topic: string;
  partitionMetadata: readonly PartitionMetadata[];
  nodeLatency?: NodeLatencyReader;
}

export interface Partitioner {
  (args: PartitionerArgs): number;
  /** Called when the producer starts grouping a new batch for a topic. */
  onNewBatch?: (args: PartitionerBatchArgs) => void;
}

export type CustomPartitioner = () => Partitioner;

export interface StickyPartitionerOptions {
  adaptive?: boolean;
}

export declare const Partitioners: Readonly<{
  DefaultPartitioner: CustomPartitioner;
  LegacyPartitioner: CustomPartitioner;
  StickyPartitioner: (options?: StickyPartitionerOptions) => Partitioner;
}>;

export interface PartitionMetadata {
  partitionErrorCode: number;
  partitionId: number;
  leader: number;
  leaderEpoch?: number;
  replicas: number[];
  isr: number[];
  offlineReplicas?: number[];
}

export interface TopicPartitionInfo {
  topic: string;
  partitionId: number;
  leader: number;
  replicas: number[];
  isr: number[];
  offlineReplicas: number[];
}

/**
 * Offset reset policy (`auto.offset.reset`). `by_duration:` takes an ISO-8601
 * duration (KIP-1106).
 */
export type AutoOffsetReset =
  'earliest' | 'latest' | 'none' | `by_duration:${string}`;

export type GroupProtocol = 'classic' | 'consumer';

export type GroupRemoteAssignor = 'uniform' | 'range';

export interface ConsumerConfig {
  /**
   * Required to use {@link Consumer.subscribe}. Optional for
   * {@link Consumer.assign} unless offsets are committed.
   */
  groupId?: string;
  partitionAssigners?: PartitionAssigner[];
  metadataMaxAge?: number;
  sessionTimeout?: number;
  rebalanceTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
  retry?: ConsumerRetryOptions;
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
  readUncommitted?: boolean;
  rackId?: string;
  /** Static membership id (KIP-345). */
  groupInstanceId?: string;
  /** Default offset reset policy for subscriptions that omit one. */
  autoOffsetReset?: AutoOffsetReset;
  /**
   * Group membership protocol. `'classic'` (default) uses JoinGroup/SyncGroup;
   * `'consumer'` opts into KIP-848 (Kafka 4.0+), under which
   * `partitionAssigners`, `sessionTimeout` and `heartbeatInterval` are unused.
   */
  groupProtocol?: GroupProtocol;
  /** Server-side assignor, used only when `groupProtocol` is `'consumer'`. */
  groupRemoteAssignor?: GroupRemoteAssignor;
  hooks?: ConsumerHooks;
  /** Verify each fetched record batch's CRC. Default `true`. */
  checkCrcs?: boolean;
}

/** ShareFetch v2 acquire mode (KIP-1206): `0` batch-optimized, `1` limited. */
export type ShareAcquireMode = 0 | 1;

export interface ShareConsumerConfig {
  groupId: string;
  heartbeatInterval?: number;
  maxWaitTimeInMs?: number;
  minBytes?: number;
  maxBytes?: number;
  maxRecords?: number;
  batchSize?: number;
  shareAcquireMode?: ShareAcquireMode;
  rackId?: string;
  retry?: ConsumerRetryOptions;
  metadataMaxAge?: number;
  allowAutoTopicCreation?: boolean;
  maxInFlightRequests?: number;
}

export interface AdminConfig {
  retry?: RetryOptions;
  /**
   * KIP-919: talk to the KRaft controller quorum instead of discovering
   * brokers. Requires Kafka 3.7+.
   */
  bootstrapControllers?: readonly string[] | BrokersFunction;
}

/**
 * Shape of a `kafka.config.*` file's default export. Unknown sections are
 * accepted so that a file written for a newer client still loads.
 */
export interface KafkaFileConfig {
  client?: Omit<KafkaConfig, 'brokers' | 'config'> & {
    brokers?: KafkaConfig['brokers'];
  };
  producer?: ProducerConfig;
  consumer?: Omit<ConsumerConfig, 'groupId'> & { groupId?: string };
  shareConsumer?: Omit<ShareConsumerConfig, 'groupId'> & { groupId?: string };
  admin?: AdminConfig;
  [key: string]: unknown;
}

/**
 * A non-fatal event raised while discovering or loading a `kafka.config.*`
 * file.
 */
export interface ConfigDiagnostic {
  code:
    | 'config.loaded'
    | 'config.multiple-candidates'
    | 'config.transform-fallback'
    | 'config.sync-load-deprecated';
  level: 'info' | 'warn';
  message: string;
  path?: string;
  [key: string]: unknown;
}

export type ConfigKeySource = 'explicit' | 'file' | 'default';

export type KafkaConfigKey = Exclude<keyof KafkaConfig, 'config'>;

export interface KafkaConfigSource {
  /** Absolute path of the config file that was used, or `null`. */
  path: string | null;
  keys: Readonly<Record<KafkaConfigKey, ConfigKeySource>>;
}

export type PartitionAssigner = (config: {
  cluster: Cluster;
  groupId: string;
  logger: Logger;
}) => Assigner;

/** Partitions per topic. */
export type MemberAssignment = Record<string, number[]>;

export interface GroupMember {
  memberId: string;
  memberMetadata: Buffer;
  groupInstanceId?: string | null;
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
  /** Classic eager (revoke all) vs incremental cooperative (KIP-429). */
  readonly protocolType?: 'eager' | 'cooperative';
  assign: (group: {
    members: readonly GroupMember[];
    topics: readonly string[];
  }) => Promise<GroupMemberAssignment[]>;
  protocol: (subscription: { topics: readonly string[] }) => GroupState;
  onAssignment?: (assignment: MemberAssignment) => void;
}

export declare const PartitionAssigners: Readonly<{
  roundRobin: PartitionAssigner;
  range: PartitionAssigner;
  sticky: PartitionAssigner;
  cooperativeSticky: PartitionAssigner;
}>;

export interface EncodedMemberMetadata {
  version: number;
  topics: readonly string[];
  userData?: Buffer;
}

export interface DecodedMemberMetadata {
  version: number;
  topics: string[];
  userData: Buffer;
}

export type MemberMetadata = DecodedMemberMetadata;

export interface EncodedMemberAssignment {
  version: number;
  assignment: MemberAssignment;
  userData?: Buffer;
}

export interface DecodedMemberAssignment {
  version: number;
  assignment: MemberAssignment;
  userData: Buffer;
}

export declare const AssignerProtocol: Readonly<{
  MemberMetadata: Readonly<{
    encode(metadata: EncodedMemberMetadata): Buffer;
    decode(buffer: Buffer): DecodedMemberMetadata;
  }>;
  MemberAssignment: Readonly<{
    encode(assignment: EncodedMemberAssignment): Buffer;
    decode(buffer: Buffer): DecodedMemberAssignment | null;
  }>;
}>;

export interface BrokerApiVersion {
  minVersion?: number;
  maxVersion: number;
}

export type BrokerVersions = Readonly<
  Record<number, BrokerApiVersion | undefined>
>;

export interface ClusterMetadataBroker {
  nodeId: number;
  host: string;
  port: number;
  rack: string | null;
}

export interface ClusterMetadataTopic {
  topicErrorCode: number;
  topic: string | null;
  topicId?: Buffer;
  isInternal: boolean;
  partitionMetadata: PartitionMetadata[];
  topicAuthorizedOperations?: number;
}

export interface ClusterMetadata {
  throttleTime: number;
  clientSideThrottleTime: number;
  brokers: ClusterMetadataBroker[];
  clusterId: string | null;
  controllerId: number;
  topicMetadata: ClusterMetadataTopic[];
  clusterAuthorizedOperations?: number;
  errorCode?: number;
}

/**
 * The connection and metadata methods of a broker. Its protocol request
 * methods are kafka-core internals and are not represented here.
 */
export interface Broker {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  apiVersions(): Promise<BrokerVersions>;
  metadata(topics?: string[]): Promise<ClusterMetadata>;
}

export interface CoordinatorMetadata {
  errorCode: number;
  errorMessage: string | null;
  coordinator: {
    nodeId: number;
    host: string;
    port: number;
  };
  throttleTime: number;
  clientSideThrottleTime: number;
}

export interface FetchTopicsOffsetTopic {
  topic: string;
  partitions: readonly { partition: number }[];
  fromBeginning?: boolean;
  fromTimestamp?: bigint;
}

export interface Cluster {
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  clientInstanceId(): Buffer | null;
  removeBroker(options: { host: string; port: number }): void;
  refreshMetadata(): Promise<void>;
  refreshMetadataIfNecessary(): Promise<void>;
  metadata(options?: {
    topics?: readonly string[];
    forceRefresh?: boolean;
  }): Promise<ClusterMetadata | null>;
  addTargetTopic(topic: string): Promise<void>;
  addMultipleTargetTopics(topics: readonly string[]): Promise<void>;
  getNodeIds(): string[];
  findBroker(node: { nodeId: string }): Promise<Broker>;
  findControllerBroker(): Promise<Broker>;
  findTopicPartitionMetadata(topic: string): PartitionMetadata[];
  findTopicId(topic: string): Buffer | undefined;
  findLeaderForPartitions(
    topic: string,
    partitions: readonly number[],
  ): Record<number, number[]>;
  findGroupCoordinator(group: {
    groupId: string;
    coordinatorType?: number;
  }): Promise<Broker>;
  findGroupCoordinatorMetadata(group: {
    groupId: string;
    coordinatorType?: number;
  }): Promise<CoordinatorMetadata>;
  defaultOffset(config: { fromBeginning?: boolean }): bigint;
  fetchTopicsOffset(
    topics: readonly FetchTopicsOffsetTopic[],
  ): Promise<TopicOffsets[]>;
  committedOffsets(group: {
    groupId: string;
  }): Record<string, Record<string, bigint>>;
  markOffsetAsCommitted(offset: {
    groupId: string;
    topic: string;
    partition: number;
    offset: bigint;
  }): void;
  listTopics(): Promise<string[]>;
  partitionsFor(topic: string): Promise<TopicPartitionInfo[]>;
}

export enum AclResourceTypes {
  UNKNOWN = 0,
  ANY = 1,
  TOPIC = 2,
  GROUP = 3,
  CLUSTER = 4,
  TRANSACTIONAL_ID = 5,
  DELEGATION_TOKEN = 6,
}

export enum ConfigResourceTypes {
  UNKNOWN = 0,
  TOPIC = 2,
  BROKER = 4,
  BROKER_LOGGER = 8,
  CLIENT_METRICS = 16,
  GROUP = 32,
}

export enum ConfigSource {
  UNKNOWN = 0,
  TOPIC_CONFIG = 1,
  DYNAMIC_BROKER_CONFIG = 2,
  DYNAMIC_DEFAULT_BROKER_CONFIG = 3,
  STATIC_BROKER_CONFIG = 4,
  DEFAULT_CONFIG = 5,
  DYNAMIC_BROKER_LOGGER_CONFIG = 6,
}

export enum AclPermissionTypes {
  UNKNOWN = 0,
  ANY = 1,
  DENY = 2,
  ALLOW = 3,
}

export enum AclOperationTypes {
  UNKNOWN = 0,
  ANY = 1,
  ALL = 2,
  READ = 3,
  WRITE = 4,
  CREATE = 5,
  DELETE = 6,
  ALTER = 7,
  DESCRIBE = 8,
  CLUSTER_ACTION = 9,
  DESCRIBE_CONFIGS = 10,
  ALTER_CONFIGS = 11,
  IDEMPOTENT_WRITE = 12,
}

export enum ResourcePatternTypes {
  UNKNOWN = 0,
  ANY = 1,
  MATCH = 2,
  LITERAL = 3,
  PREFIXED = 4,
}

export interface ReplicaAssignment {
  partition: number;
  replicas: number[];
}

export interface ResourceConfigEntry {
  name: string;
  value: string;
}

export interface TopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
  replicaAssignment?: ReplicaAssignment[];
  configEntries?: ResourceConfigEntry[];
}

export interface TopicPartitionConfig {
  topic: string;
  count: number;
  assignments?: number[][];
}

export interface TopicMetadata {
  name: string;
  topicId?: Buffer;
  partitions: PartitionMetadata[];
}

export type ITopicMetadata = TopicMetadata;

/** An offset as a `bigint`, an integer `number` or a numeric string. */
export type OffsetInput = bigint | number | string;

export interface SeekEntry {
  partition: number;
  offset: bigint;
}

export interface SeekInput {
  partition: number;
  offset: OffsetInput;
}

export interface TopicOffset {
  partition: number;
  offset: bigint;
  high: bigint;
  low: bigint;
}

export interface FetchOffsetsPartition {
  partition: number;
  offset: bigint;
  metadata: string | null;
}

export interface ClusterDescription {
  brokers: { nodeId: number; host: string; port: number }[];
  controller: number | null;
  clusterId: string | null;
}

export interface ResourceConfigQuery {
  type: ConfigResourceTypes;
  name: string;
  configNames?: string[];
}

export interface ResourceConfig {
  type: ConfigResourceTypes;
  name: string;
  configEntries: ResourceConfigEntry[];
}

export interface DescribeConfigsSynonym {
  configName: string;
  configValue: string | null;
  configSource: number;
}

export interface DescribeConfigsEntry {
  configName: string;
  configValue: string | null;
  readOnly: boolean;
  isDefault: boolean;
  configSource: number;
  isSensitive: boolean;
  configSynonyms: DescribeConfigsSynonym[];
  configType?: number;
  documentation?: string | null;
}

export interface DescribeConfigsResourceResult {
  errorCode: number;
  errorMessage: string | null;
  resourceType: number;
  resourceName: string;
  configEntries: DescribeConfigsEntry[];
}

export interface AlterConfigsResourceResult {
  errorCode: number;
  errorMessage: string | null;
  resourceType: number;
  resourceName: string;
}

export interface Acl {
  principal: string;
  host: string;
  operation: AclOperationTypes;
  permissionType: AclPermissionTypes;
}

export interface AclResource {
  resourceType: AclResourceTypes;
  resourceName: string;
  resourcePatternType: ResourcePatternTypes;
}

export type AclEntry = Acl & AclResource;

export interface AclFilter {
  resourceType: AclResourceTypes;
  resourceName?: string;
  resourcePatternType: ResourcePatternTypes;
  principal?: string;
  host?: string;
  operation: AclOperationTypes;
  permissionType: AclPermissionTypes;
}

export interface DescribeAclResource {
  resourceType: number;
  resourceName: string;
  resourcePatternType: number;
  acls: {
    principal: string;
    host: string;
    operation: number;
    permissionType: number;
  }[];
}

export interface MatchingAcl {
  errorCode: number;
  errorMessage: string | null;
  resourceType: number;
  resourceName: string;
  resourcePatternType: number;
  principal: string;
  host: string;
  operation: number;
  permissionType: number;
}

export interface DeleteAclFilterResponses {
  errorCode: number;
  errorMessage: string | null;
  matchingAcls: MatchingAcl[];
}

export interface GroupOverview {
  groupId: string;
  protocolType: string;
}

export interface DeleteGroupsResult {
  groupId: string;
  errorCode: number;
  error?: KafkaProtocolError;
}

export interface MemberDescription {
  clientHost: string;
  clientId: string;
  memberId: string;
  memberAssignment: Buffer;
  memberMetadata: Buffer;
}

export type ConsumerGroupState =
  | 'Unknown'
  | 'PreparingRebalance'
  | 'CompletingRebalance'
  | 'Stable'
  | 'Dead'
  | 'Empty';

export interface GroupDescription {
  groupId: string;
  members: MemberDescription[];
  protocol: string;
  protocolType: string;
  state: string;
}

export interface GroupDescriptions {
  groups: (GroupDescription & { errorCode: number })[];
}

export interface InstrumentationEvent<T> {
  readonly id: number;
  readonly timestamp: number;
  readonly type: string;
  readonly payload: T;
}

export type RemoveInstrumentationEventListener = () => void;

export type ConnectEvent = InstrumentationEvent<Record<string, never>>;
export type DisconnectEvent = InstrumentationEvent<Record<string, never>>;
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
  pendingDuration: number | null;
  sentAt: number | null;
}>;
export type RequestQueueSizeEvent = InstrumentationEvent<{
  broker: string;
  clientId: string;
  queueSize: number;
}>;

export type AdminEvents = Readonly<{
  CONNECT: 'admin.connect';
  DISCONNECT: 'admin.disconnect';
  REQUEST: 'admin.network.request';
  REQUEST_TIMEOUT: 'admin.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'admin.network.request_queue_size';
}>;

export type AdminEventName = ValueOf<AdminEvents>;

export interface Admin {
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: (options?: ConnectOptions) => Promise<void>;
  clientInstanceId: () => Buffer | null;
  listTopics: () => Promise<string[]>;
  createTopics: (options: {
    topics: TopicConfig[];
    validateOnly?: boolean;
    timeout?: number;
    waitForLeaders?: boolean;
  }) => Promise<boolean>;
  deleteTopics: (options: {
    topics: string[];
    timeout?: number;
  }) => Promise<void>;
  createPartitions: (options: {
    topicPartitions: TopicPartitionConfig[];
    validateOnly?: boolean;
    timeout?: number;
  }) => Promise<void>;
  fetchTopicMetadata: (options?: {
    topics?: string[];
  }) => Promise<{ topics: TopicMetadata[] }>;
  describeCluster: () => Promise<ClusterDescription>;
  deleteTopicRecords: (options: {
    topic: string;
    partitions: SeekInput[];
  }) => Promise<void>;
  fetchOffsets: (options: {
    groupId: string;
    topics?: string[];
    resolveOffsets?: boolean;
  }) => Promise<{ topic: string; partitions: FetchOffsetsPartition[] }[]>;
  fetchTopicOffsets: (topic: string) => Promise<TopicOffset[]>;
  fetchTopicOffsetsByTimestamp: (
    topic: string,
    timestamp?: OffsetInput,
  ) => Promise<SeekEntry[]>;
  setOffsets: (options: {
    groupId: string;
    topic: string;
    partitions: SeekInput[];
  }) => Promise<void>;
  resetOffsets: (options: {
    groupId: string;
    topic: string;
    earliest?: boolean;
  }) => Promise<void>;
  describeConfigs: (options: {
    resources: ResourceConfigQuery[];
    includeSynonyms?: boolean;
    includeDocumentation?: boolean;
  }) => Promise<{ resources: DescribeConfigsResourceResult[] }>;
  alterConfigs: (options: {
    resources: ResourceConfig[];
    validateOnly?: boolean;
  }) => Promise<{ resources: AlterConfigsResourceResult[] }>;
  listGroups: () => Promise<{ groups: GroupOverview[] }>;
  describeGroups: (groupIds: string[]) => Promise<GroupDescriptions>;
  deleteGroups: (groupIds: string[]) => Promise<DeleteGroupsResult[]>;
  createAcls: (options: { acl: AclEntry[] }) => Promise<boolean>;
  describeAcls: (
    options: AclFilter,
  ) => Promise<{ resources: DescribeAclResource[] }>;
  deleteAcls: (options: {
    filters: AclFilter[];
  }) => Promise<{ filterResponses: DeleteAclFilterResponses[] }>;
  on: (
    eventName: AdminEventName,
    listener: (event: InstrumentationEvent<unknown>) => void | Promise<void>,
  ) => RemoveInstrumentationEventListener;
  logger: () => Logger;
  readonly events: AdminEvents;
}

export enum logLevel {
  NOTHING = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 4,
  DEBUG = 5,
}

export type LogLevel = logLevel;

export interface LogEntry {
  namespace: string | undefined;
  level: LogLevel;
  label: string;
  log: {
    timestamp: string;
    logger: string;
    message: string;
    [key: string]: unknown;
  };
}

export type LogCreator = (logLevel: LogLevel) => (entry: LogEntry) => void;
export type logCreator = LogCreator;

export interface Logger {
  info(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  debug(message: string, extra?: Record<string, unknown>): void;
  namespace(namespace: string, logLevel?: LogLevel | null): Logger;
  setLogLevel(newLevel: LogLevel): void;
}

export type TimestampType = -1 | 0 | 1;

export interface RecordBatchContext {
  firstOffset: bigint;
  firstTimestamp: bigint;
  partitionLeaderEpoch: number;
  inTransaction: boolean;
  isControlBatch: boolean;
  lastOffsetDelta: number;
  producerId: bigint;
  producerEpoch: number;
  firstSequence: number;
  maxTimestamp: bigint;
  timestampType: TimestampType;
  magicByte: number;
}

/** Decoded record from a Fetch response. */
export interface KafkaMessage {
  magicByte: number;
  attributes: number;
  timestamp: bigint;
  offset: bigint;
  key: Buffer | null;
  value: Buffer | null;
  headers: RecordHeaders;
  isControlRecord: boolean;
  batchContext: RecordBatchContext;
  /**
   * This message's on-wire size, after decompression. Unset on kafkajs, which
   * reports a size only for messages in the legacy MessageSet format.
   */
  byteSize?: number;
}

export interface ProducerRecord {
  topic: string;
  messages: readonly Message[];
  acks?: number;
  timeout?: number;
  compression?: CompressionTypes;
  compressionLevel?: number;
}

export interface TopicMessages {
  topic: string;
  messages: readonly Message[];
}

export interface ProducerBatch {
  acks?: number;
  timeout?: number;
  compression?: CompressionTypes;
  compressionLevel?: number;
  topicMessages?: readonly TopicMessages[];
}

export interface RecordMetadata {
  topicName: string;
  partition: number;
  errorCode: number;
  baseOffset: bigint;
  logAppendTime: bigint;
  logStartOffset: bigint;
}

export interface ProducerSendHookEvent {
  topicMessages: readonly TopicMessages[];
  acks: number;
  timeout: number;
  compression?: CompressionTypes;
}

/** Exactly one of `metadata` (on success) and `error` is set. */
export interface ProducerAckHookEvent extends ProducerSendHookEvent {
  metadata?: RecordMetadata[];
  error?: unknown;
}

export type ProducerSendHook = (
  event: ProducerSendHookEvent,
) => void | Promise<void>;
export type ProducerAckHook = (
  event: ProducerAckHookEvent,
) => void | Promise<void>;

/**
 * Hooks run in registration order, each awaited before the next; a hook that
 * throws is logged and never fails the send.
 */
export interface ProducerHooks {
  onSend?: readonly ProducerSendHook[];
  onAck?: readonly ProducerAckHook[];
}

export interface PartitionOffset {
  partition: number;
  offset: bigint;
}

export interface TopicOffsets {
  topic: string;
  partitions: PartitionOffset[];
}

export interface Offsets {
  topics: TopicOffsets[];
}

export interface OffsetsByTopicPartition {
  topics: TopicOffsets[];
}

export type ProducerEvents = Readonly<{
  CONNECT: 'producer.connect';
  DISCONNECT: 'producer.disconnect';
  REQUEST: 'producer.network.request';
  REQUEST_TIMEOUT: 'producer.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size';
}>;

export type ProducerEventName = ValueOf<ProducerEvents>;

export interface Transaction {
  send(
    record: ProducerRecord & { signal?: AbortSignal },
  ): Promise<RecordMetadata[]>;
  sendBatch(
    batch: ProducerBatch & { signal?: AbortSignal },
  ): Promise<RecordMetadata[]>;
  sendOffsets(options: {
    consumerGroupId: string;
    topics: readonly TopicOffsets[];
  }): Promise<void>;
  commit(): Promise<void>;
  abort(): Promise<void>;
  isActive(): boolean;
}

export interface Producer {
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: (options?: ConnectOptions) => Promise<void>;
  isIdempotent: () => boolean;
  readonly events: ProducerEvents;
  on: (
    eventName: ProducerEventName,
    listener: (event: InstrumentationEvent<unknown>) => void | Promise<void>,
  ) => RemoveInstrumentationEventListener;
  send: (
    record: ProducerRecord & { signal?: AbortSignal },
  ) => Promise<RecordMetadata[]>;
  sendBatch: (
    batch: ProducerBatch & { signal?: AbortSignal },
  ) => Promise<RecordMetadata[]>;
  /** Sends any linger-buffered records immediately. */
  flush: () => Promise<void>;
  transaction: () => Promise<Transaction>;
  listTopics: () => Promise<string[]>;
  partitionsFor: (topic: string) => Promise<TopicPartitionInfo[]>;
  clientInstanceId: () => Buffer | null;
  logger: () => Logger;
}

export interface TopicPartitions {
  topic: string;
  partitions: number[];
}

export interface TopicPartition {
  topic: string;
  partition: number;
}

export interface TopicPartitionOffset extends TopicPartition {
  offset: bigint;
}

export interface TopicPartitionOffsetAndMetadata extends TopicPartitionOffset {
  metadata?: string | null;
}

/** Messages from a single fetch response partition. */
export interface Batch {
  readonly topic: string;
  readonly partition: number;
  readonly highWatermark: bigint;
  readonly fetchedOffset: bigint;
  readonly rawMessages: readonly KafkaMessage[];
  readonly messagesWithinOffset: KafkaMessage[];
  readonly messages: KafkaMessage[];
  isEmpty(): boolean;
  isEmptyIncludingFiltered(): boolean;
  isEmptyDueToFiltering(): boolean;
  isEmptyControlRecord(): boolean;
  isEmptyDueToLogCompactedMessages(): boolean;
  firstOffset(): bigint | null;
  lastOffset(): bigint;
  offsetLag(): bigint;
  offsetLagLow(): bigint;
}

export type ConsumerEvents = Readonly<{
  HEARTBEAT: 'consumer.heartbeat';
  COMMIT_OFFSETS: 'consumer.commit_offsets';
  GROUP_JOIN: 'consumer.group_join';
  FETCH: 'consumer.fetch';
  FETCH_START: 'consumer.fetch_start';
  START_BATCH_PROCESS: 'consumer.start_batch_process';
  END_BATCH_PROCESS: 'consumer.end_batch_process';
  CONNECT: 'consumer.connect';
  DISCONNECT: 'consumer.disconnect';
  STOP: 'consumer.stop';
  CRASH: 'consumer.crash';
  REBALANCING: 'consumer.rebalancing';
  RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics';
  REQUEST: 'consumer.network.request';
  REQUEST_TIMEOUT: 'consumer.network.request_timeout';
  REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size';
}>;

export type ConsumerEventName = ValueOf<ConsumerEvents>;

export type ConsumerHeartbeatEvent = InstrumentationEvent<{
  groupId: string;
  memberId: string;
  groupGenerationId: number;
}>;
export type ConsumerCommitOffsetsEvent = InstrumentationEvent<{
  groupId: string;
  memberId: string;
  groupGenerationId: number;
  topics: TopicOffsets[];
}>;
export type ConsumerGroupJoinEvent = InstrumentationEvent<{
  duration: number;
  groupId: string;
  isLeader: boolean;
  leaderId: string | null;
  groupProtocol: string | null;
  memberId: string | null;
  memberAssignment: MemberAssignment;
}>;
export type ConsumerFetchStartEvent = InstrumentationEvent<{ nodeId: string }>;
export type ConsumerFetchEvent = InstrumentationEvent<{
  numberOfBatches: number;
  duration: number;
  nodeId: string;
}>;
interface IBatchProcessEvent {
  topic: string;
  partition: number;
  highWatermark: bigint;
  offsetLag: bigint;
  offsetLagLow: bigint;
  batchSize: number;
  firstOffset: bigint | null;
  lastOffset: bigint;
}
export type ConsumerStartBatchProcessEvent =
  InstrumentationEvent<IBatchProcessEvent>;
export type ConsumerEndBatchProcessEvent = InstrumentationEvent<
  IBatchProcessEvent & { duration: number }
>;
export type ConsumerStopEvent = InstrumentationEvent<Record<string, never>>;
export type ConsumerCrashEvent = InstrumentationEvent<{
  error: Error;
  groupId: string;
  restart: boolean;
}>;
export type ConsumerRebalancingEvent = InstrumentationEvent<{
  groupId: string;
  memberId: string | null;
}>;
export type ConsumerReceivedUnsubscribedTopicsEvent = InstrumentationEvent<{
  groupId: string;
  generationId: number | null;
  memberId: string | null;
  assignedTopics: string[];
  topicsSubscribed: string[];
  topicsNotSubscribed: string[];
}>;

export interface EachMessagePayload {
  topic: string;
  partition: number;
  message: KafkaMessage;
  heartbeat: () => Promise<void>;
  pause: () => () => void;
}

export interface EachBatchPayload {
  batch: Batch;
  resolveOffset: (offset: bigint) => void;
  heartbeat: () => Promise<void>;
  pause: () => () => void;
  commitOffsetsIfNecessary: (offsets?: Offsets) => Promise<void>;
  uncommittedOffsets: () => OffsetsByTopicPartition;
  isRunning: () => boolean;
  isStale: () => boolean;
}

export type EachBatchHandler = (payload: EachBatchPayload) => Promise<void>;
export type EachMessageHandler = (payload: EachMessagePayload) => Promise<void>;

/**
 * Called with only the partitions moving in that rebalance step. An error it
 * throws is logged and does not abort the rebalance.
 */
export type RebalanceListener = (
  topicPartitions: TopicPartition[],
) => void | Promise<void>;

export interface ConsumerRunConfig {
  autoCommit?: boolean;
  /**
   * When both this and `autoCommitThreshold` are unset, offsets are committed
   * once after each fetched batch is processed.
   */
  autoCommitInterval?: number | null;
  autoCommitThreshold?: number | null;
  eachBatchAutoResolve?: boolean;
  partitionsConsumedConcurrently?: number;
  /** Max queued and in-flight batches prefetched per broker node. */
  prefetchMaxBatches?: number;
  /** Max queued and in-flight record bytes prefetched per broker node. */
  prefetchMaxBytes?: number;
  /**
   * Caps how many records of a fetched batch are delivered to the handler per
   * processing cycle (Java's `max.poll.records`). Defaults to `500` for
   * `eachMessage`; unlimited for `eachBatch` unless set.
   */
  maxRecords?: number;
  eachBatch?: EachBatchHandler | null;
  eachMessage?: EachMessageHandler | null;
  signal?: AbortSignal;
  onPartitionsRevoked?: RebalanceListener;
  onPartitionsAssigned?: RebalanceListener;
  /** Called instead of `onPartitionsRevoked` when the assignment was lost. */
  onPartitionsLost?: RebalanceListener;
}

export interface ConsumerSubscribeTopics {
  topics: readonly (string | RegExp)[];
  fromBeginning?: boolean;
  /** Wins over `fromBeginning` when set. `none` throws instead of resetting. */
  autoOffsetReset?: AutoOffsetReset;
}

export interface ConsumerSubscribeTopic {
  topic: string | RegExp;
  fromBeginning?: boolean;
  /** Wins over `fromBeginning` when set. `none` throws instead of resetting. */
  autoOffsetReset?: AutoOffsetReset;
}

/** Exactly one of `message` (`eachMessage` mode) and `batch` is set. */
export interface OnConsumeEvent {
  topic: string;
  partition: number;
  message?: KafkaMessage;
  batch?: Batch;
}

export type OnConsumeHook = (event: OnConsumeEvent) => void | Promise<void>;

export interface OnCommitEvent {
  groupId: string;
  memberId: string;
  groupGenerationId: number;
  topics: TopicOffsets[];
  error?: unknown;
}

export type OnCommitHook = (event: OnCommitEvent) => void | Promise<void>;

/**
 * Hooks run in registration order, each awaited before the next; a hook that
 * throws is logged and never fails consumption or the commit.
 */
export interface ConsumerHooks {
  onConsume?: readonly OnConsumeHook[];
  onCommit?: readonly OnCommitHook[];
}

export interface Consumer {
  connect: (options?: ConnectOptions) => Promise<void>;
  disconnect: (options?: ConnectOptions) => Promise<void>;
  subscribe: (
    subscription: ConsumerSubscribeTopics | ConsumerSubscribeTopic,
  ) => Promise<void>;
  /**
   * Assigns exact partitions with no group membership. Mutually exclusive
   * with {@link Consumer.subscribe}.
   */
  assign: (
    topicPartitions: readonly { topic: string; partition: number }[],
  ) => Promise<void>;
  stop: () => Promise<void>;
  run: (config?: ConsumerRunConfig) => Promise<void>;
  /** Cannot run alongside {@link Consumer.run}. */
  stream: (
    config?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>,
  ) => AsyncIterableIterator<Batch>;
  commitOffsets: (
    topicPartitions: readonly TopicPartitionOffsetAndMetadata[],
  ) => Promise<void>;
  seek: (topicPartitionOffset: {
    topic: string;
    partition: number;
    offset: bigint | number | string;
  }) => void;
  describeGroup: () => Promise<GroupDescription>;
  /** A partition with no committed offset comes back with `offset: -1n`. */
  committed: (
    topicPartitions: readonly TopicPartition[],
  ) => Promise<TopicPartitionOffsetAndMetadata[]>;
  /** `null` when the partition is not assigned to this consumer. */
  position: (topicPartition: TopicPartition) => bigint | null;
  /** `null` when the partition is not assigned or its lag is not known yet. */
  currentLag: (topicPartition: TopicPartition) => bigint | null;
  listTopics: () => Promise<string[]>;
  partitionsFor: (topic: string) => Promise<TopicPartitionInfo[]>;
  clientInstanceId: () => Buffer | null;
  pause: (topics: readonly { topic: string; partitions?: number[] }[]) => void;
  paused: () => TopicPartitions[];
  resume: (topics: readonly { topic: string; partitions?: number[] }[]) => void;
  on: (
    eventName: ConsumerEventName,
    listener: (event: InstrumentationEvent<unknown>) => void | Promise<void>,
  ) => RemoveInstrumentationEventListener;
  readonly events: ConsumerEvents;
  logger: () => Logger;
}

export enum CompressionTypes {
  None = 0,
  GZIP = 1,
  Snappy = 2,
  LZ4 = 3,
  ZSTD = 4,
}

export type CompressionType = CompressionTypes;

export interface CompressionCodec {
  compress(
    encoder: { readonly buffer: Buffer },
    level?: number,
  ): Promise<Buffer>;
  decompress(buffer: Buffer): Promise<Buffer>;
}

export type CompressionCodecFactory = () => CompressionCodec;

export declare const CompressionCodecs: Record<number, CompressionCodecFactory>;

export type KafkaErrorName =
  | 'KafkaError'
  | 'KafkaNonRetriableError'
  | 'KafkaProtocolError'
  | 'KafkaOffsetOutOfRange'
  | 'KafkaMemberIdRequired'
  | 'KafkaNumberOfRetriesExceeded'
  | 'KafkaConnectionError'
  | 'KafkaConnectionClosedError'
  | 'KafkaRequestTimeoutError'
  | 'KafkaMetadataNotLoaded'
  | 'KafkaTopicMetadataNotLoaded'
  | 'KafkaStaleTopicMetadataAssignment'
  | 'KafkaDeleteGroupsError'
  | 'KafkaServerDoesNotSupportApiKey'
  | 'KafkaBrokerNotFound'
  | 'KafkaPartialMessageError'
  | 'KafkaSASLAuthenticationError'
  | 'KafkaGroupCoordinatorNotFound'
  | 'KafkaNotImplemented'
  | 'KafkaTimeout'
  | 'KafkaLockTimeout'
  | 'KafkaDeliveryTimeoutError'
  | 'KafkaMessageTooLargeError'
  | 'KafkaUnsupportedMagicByteInMessageSet'
  | 'KafkaCorruptRecordError'
  | 'KafkaDeleteTopicRecordsError'
  | 'KafkaInvariantViolation'
  | 'KafkaInvalidVarIntError'
  | 'KafkaInvalidLongError'
  | 'KafkaCreateTopicError'
  | 'KafkaAggregateError'
  | 'KafkaFetcherRebalanceError'
  | 'KafkaNoBrokerAvailableError'
  | 'KafkaAlterPartitionReassignmentsError'
  | 'KafkaUpdateFeaturesError'
  | 'KafkaConfigError'
  | 'KafkaConfigRequiresAsyncError';

export interface KafkaErrorOptions {
  retriable?: boolean;
  cause?: unknown;
}

type ErrorLike = {
  message: string;
  helpUrl?: string;
  stack?: string;
};

export declare class KafkaError extends Error {
  readonly name: KafkaErrorName;
  readonly retriable: boolean;
  readonly helpUrl: string | undefined;
  readonly cause: unknown;
  constructor(e: string | ErrorLike, options?: KafkaErrorOptions);
}

export declare class KafkaNonRetriableError extends KafkaError {
  constructor(e: string | ErrorLike, options?: { cause?: unknown });
}

export interface CurrentLeader {
  leaderId: number;
  leaderEpoch: number;
}

export interface NodeEndpoint {
  nodeId: number;
  host: string;
  port: number;
  rack: string | null;
}

export interface KafkaProtocolErrorOptions {
  retriable?: boolean;
  topic?: string;
  partition?: number;
  currentLeader?: CurrentLeader;
  nodeEndpoints?: readonly NodeEndpoint[];
}

export declare class KafkaProtocolError extends KafkaError {
  readonly type: string | undefined;
  readonly code: number | undefined;
  readonly topic: string | undefined;
  readonly partition: number | undefined;
  readonly currentLeader: CurrentLeader | undefined;
  readonly nodeEndpoints: readonly NodeEndpoint[] | undefined;
  constructor(
    e: ErrorLike & { retriable?: boolean; type?: string; code?: number },
    options?: KafkaProtocolErrorOptions,
  );
}

export declare class KafkaOffsetOutOfRange extends KafkaProtocolError {
  constructor(
    e: ConstructorParameters<typeof KafkaProtocolError>[0],
    options: KafkaProtocolErrorOptions,
  );
}

export declare class KafkaMemberIdRequired extends KafkaProtocolError {
  readonly memberId: string | undefined;
  constructor(
    e: ConstructorParameters<typeof KafkaProtocolError>[0],
    options: { memberId?: string },
  );
}

export declare class KafkaNumberOfRetriesExceeded extends KafkaNonRetriableError {
  readonly retryCount: number;
  readonly retryTime: number;
  constructor(e: ErrorLike, options: { retryCount: number; retryTime: number });
}

export declare class KafkaConnectionError extends KafkaError {
  readonly broker: string | undefined;
  readonly code: string | undefined;
  constructor(
    e: string | ErrorLike,
    options?: { broker?: string; code?: string },
  );
}

export declare class KafkaConnectionClosedError extends KafkaConnectionError {
  readonly host: string | undefined;
  readonly port: number | undefined;
  constructor(
    e: string | ErrorLike,
    options?: { host?: string; port?: number },
  );
}

export declare class KafkaRequestTimeoutError extends KafkaError {
  readonly broker: string | undefined;
  readonly correlationId: number | undefined;
  readonly createdAt: number | undefined;
  readonly sentAt: number | undefined;
  readonly pendingDuration: number | undefined;
  constructor(
    e: string | ErrorLike,
    options?: {
      broker?: string;
      correlationId?: number;
      createdAt?: number;
      sentAt?: number;
      pendingDuration?: number;
    },
  );
}

export declare class KafkaMetadataNotLoaded extends KafkaError {}

export declare class KafkaTopicMetadataNotLoaded extends KafkaMetadataNotLoaded {
  readonly topic: string | undefined;
  constructor(e: string | ErrorLike, options?: { topic?: string });
}

export declare class KafkaStaleTopicMetadataAssignment extends KafkaError {
  readonly topic: string | undefined;
  readonly unknownPartitions: unknown;
  constructor(
    e: string | ErrorLike,
    options?: { topic?: string; unknownPartitions?: unknown },
  );
}

export interface DeleteGroupError {
  groupId: string;
  errorCode?: number;
  error?: KafkaError;
}

export declare class KafkaDeleteGroupsError extends KafkaError {
  readonly groups: readonly DeleteGroupError[];
  constructor(e: string | ErrorLike, groups?: readonly DeleteGroupError[]);
}

export interface KafkaServerDoesNotSupportApiKeyOptions {
  apiKey?: number;
  apiName?: string;
  brokerMinVersion?: number;
  brokerMaxVersion?: number;
  implementedVersions?: readonly number[];
}

export declare class KafkaServerDoesNotSupportApiKey extends KafkaNonRetriableError {
  readonly apiKey: number | undefined;
  readonly apiName: string | undefined;
  readonly brokerMinVersion: number | undefined;
  readonly brokerMaxVersion: number | undefined;
  readonly implementedVersions: readonly number[] | undefined;
  constructor(
    e: string | ErrorLike,
    options?: KafkaServerDoesNotSupportApiKeyOptions,
  );
}

export declare class KafkaBrokerNotFound extends KafkaError {}

export declare class KafkaPartialMessageError extends KafkaNonRetriableError {}

export declare class KafkaSASLAuthenticationError extends KafkaNonRetriableError {}

export declare class KafkaGroupCoordinatorNotFound extends KafkaNonRetriableError {}

export declare class KafkaNotImplemented extends KafkaNonRetriableError {}

export declare class KafkaTimeout extends KafkaNonRetriableError {}

export declare class KafkaLockTimeout extends KafkaTimeout {}

/** `deliveryTimeoutMs` elapsed before a produce settled. */
export declare class KafkaDeliveryTimeoutError extends KafkaTimeout {
  readonly deliveryTimeoutMs: number;
  constructor(deliveryTimeoutMs: number);
}

export interface KafkaMessageTooLargeErrorOptions {
  size: number;
  maxRequestSize: number;
  topic?: string;
}

/** Raised client-side, before the record reaches the network. */
export declare class KafkaMessageTooLargeError extends KafkaNonRetriableError {
  readonly size: number;
  readonly maxRequestSize: number;
  readonly topic: string | undefined;
  constructor(options: KafkaMessageTooLargeErrorOptions);
}

export declare class KafkaUnsupportedMagicByteInMessageSet extends KafkaNonRetriableError {}

export declare class KafkaCorruptRecordError extends KafkaNonRetriableError {
  readonly expectedCrc: number;
  readonly computedCrc: number;
  constructor(
    message: string,
    options: { expectedCrc: number; computedCrc: number },
  );
}

export interface DeleteTopicRecordPartition {
  partition: number;
  error?: { retriable?: boolean };
  [key: string]: unknown;
}

export declare class KafkaDeleteTopicRecordsError extends KafkaError {
  readonly partitions: readonly DeleteTopicRecordPartition[];
  constructor(options: { partitions: readonly DeleteTopicRecordPartition[] });
}

export declare class KafkaInvariantViolation extends KafkaNonRetriableError {
  constructor(e: string | ErrorLike);
}

export declare class KafkaInvalidVarIntError extends KafkaNonRetriableError {}

export declare class KafkaInvalidLongError extends KafkaNonRetriableError {}

export declare class KafkaCreateTopicError extends KafkaProtocolError {
  readonly topic: string;
  constructor(
    e: ConstructorParameters<typeof KafkaProtocolError>[0],
    topicName: string,
  );
}

export declare class KafkaAlterPartitionReassignmentsError extends KafkaProtocolError {
  readonly topic: string;
  readonly partition: number;
  constructor(
    e: ConstructorParameters<typeof KafkaProtocolError>[0],
    topicName: string,
    partition: number,
  );
}

export declare class KafkaUpdateFeaturesError extends KafkaProtocolError {
  readonly feature: string;
  constructor(
    e: ConstructorParameters<typeof KafkaProtocolError>[0],
    feature: string,
  );
}

export declare class KafkaAggregateError extends Error {
  readonly name: KafkaErrorName;
  readonly errors: readonly unknown[];
  constructor(message: string, errors: readonly unknown[]);
}

export declare class KafkaFetcherRebalanceError extends Error {
  readonly name: KafkaErrorName;
}

export declare class KafkaNoBrokerAvailableError extends KafkaError {
  constructor();
}

export type KafkaConfigErrorTag =
  | 'MissingBrokers'
  | 'ConfigFileNotFound'
  | 'ConfigLoadError'
  | 'ConfigFileInvalid'
  | 'UnsupportedExtension';

export interface KafkaConfigErrorOptions {
  path?: string;
  cause?: unknown;
}

/** Raised while discovering, loading, parsing or resolving a config file. */
export declare class KafkaConfigError extends KafkaNonRetriableError {
  readonly tag: KafkaConfigErrorTag;
  readonly path: string | undefined;
  constructor(
    tag: KafkaConfigErrorTag,
    message: string,
    options?: KafkaConfigErrorOptions,
  );
}

/**
 * A config file uses top-level `await`, so it cannot be loaded synchronously;
 * use `Kafka.fromConfig()` instead of `new Kafka()`.
 */
export declare class KafkaConfigRequiresAsyncError extends KafkaNonRetriableError {
  readonly path: string;
  constructor(path: string, options?: { cause?: unknown });
}
