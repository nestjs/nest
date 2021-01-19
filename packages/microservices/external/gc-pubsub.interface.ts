import { EventEmitter } from 'events';

export interface PubSubConfig {
  apiEndpoint?: string;
  servicePath?: string;
  port?: string | number;
  projectId?: string;
}

interface BatchPublishOptions {
  maxBytes?: number;
  maxMessages?: number;
  maxMilliseconds?: number;
}

interface BackoffSettings {
  maxRetries?: number;
  initialRetryDelayMillis: number;
  retryDelayMultiplier: number;
  maxRetryDelayMillis: number;
  initialRpcTimeoutMillis?: number | null;
  maxRpcTimeoutMillis?: number | null;
  totalTimeoutMillis?: number | null;
  rpcTimeoutMultiplier?: number | null;
}

declare class RetryOptions {
  retryCodes: number[];
  backoffSettings: BackoffSettings;
  constructor(retryCodes: number[], backoffSettings: BackoffSettings);
}

interface BundleOptions {
  elementCountLimit?: number;
  requestByteLimit?: number;
  elementCountThreshold?: number;
  requestByteThreshold?: number;
  delayThreshold?: number;
}

interface RetryRequestOptions {
  objectMode?: boolean;
  request?: any;
  retries?: number;
  noResponseRetries?: number;
  currentRetryAttempt?: number;
  shouldRetryFn?: () => boolean;
}

interface CallOptions {
  timeout?: number;
  retry?: Partial<RetryOptions> | null;
  autoPaginate?: boolean;
  pageToken?: string;
  pageSize?: number;
  maxResults?: number;
  maxRetries?: number;
  otherArgs?: {
    [index: string]: any;
  };
  bundleOptions?: BundleOptions | null;
  isBundling?: boolean;
  longrunning?: BackoffSettings;
  apiName?: string;
  retryRequestOptions?: RetryRequestOptions;
}

export interface PublishConfig {
  batching?: BatchPublishOptions;
  gaxOpts?: CallOptions;
  messageOrdering?: boolean;
  enableOpenTelemetryTracing?: boolean;
}

export interface BatchOptions {
  callOptions?: CallOptions;
  maxMessages?: number;
  maxMilliseconds?: number;
}

export interface FlowControlOptions {
  allowExcessMessages?: boolean;
  maxBytes?: number;
  maxExtension?: number;
  maxMessages?: number;
}

export interface MessageStreamOptions {
  highWaterMark?: number;
  maxStreams?: number;
  timeout?: number;
}

export interface SubscriberConfig {
  noAck?: boolean;
  ackDeadline?: number;
  batching?: BatchOptions;
  flowControl?: FlowControlOptions;
  useLegacyFlowControl?: boolean;
  streamingOptions?: MessageStreamOptions;
  enableOpenTelemetryTracing?: boolean;
}

export interface PubSub {
  topic(name: string, options?: PublishConfig): Topic;

  close(): Promise<void>;
  close(callback: Function): void;
}

export declare type SubscriptionMetadata = {
  messageRetentionDuration?: number;
};

export declare type CreateSubscriptionOptions = SubscriptionMetadata & {
  gaxOpts?: CallOptions;
  flowControl?: FlowControlOptions;
};

export declare type CreateSubscriptionResponse = [Subscription, any];

export interface Subscription extends EventEmitter {
  name: string;
  create(
    options?: CreateSubscriptionOptions,
  ): Promise<CreateSubscriptionResponse>;
  exists(): Promise<ExistsResponse>;
  close(): Promise<void>;
}

export interface Attributes {
  [key: string]: string;
}

export declare type ExistsResponse = [boolean];

export declare type CreateTopicResponse = [Topic, any];

export interface Topic {
  name: string;
  flush(): Promise<void>;
  create(gaxOpts?: CallOptions): Promise<CreateTopicResponse>;
  exists(): Promise<ExistsResponse>;
  subscription(name: string, options?: SubscriberConfig): Subscription;
  publish(data: Buffer, attributes?: Attributes): Promise<string>;
  publishJSON(json: object, attributes?: Attributes): Promise<string>;
}

export interface Message {
  ackId: string;
  attributes: {
    [key: string]: string;
  };
  data: Buffer;
  deliveryAttempt: number;
  id: string;
  orderingKey?: string;
  publishTime: Date;
  received: number;
  ack(): void;
  modAck(deadline: number): void;
  nack(): void;
}

export enum ErrorCode {
  ALREADY_EXISTS = 6,
}
