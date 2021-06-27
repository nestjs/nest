/**
 * @see https://github.com/nats-io/nats.js
 */
export interface NatsCodec<T> {
  encode(d: T): Uint8Array;
  decode(a: Uint8Array): T;
}

interface RequestOptions {
  timeout: number;
  headers?: any;
  noMux?: boolean;
  reply?: string;
}
interface PublishOptions {
  reply?: string;
  headers?: any;
}
interface SubOpts<T> {
  queue?: string;
  max?: number;
  timeout?: number;
  callback?: (err: object | null, msg: T) => void;
}

declare type SubscriptionOptions = SubOpts<NatsMsg>;

export interface NatsMsg {
  subject: string;
  sid: number;
  reply?: string;
  data: Uint8Array;
  headers?: any;
  respond(data?: Uint8Array, opts?: PublishOptions): boolean;
}

interface Sub<T> extends AsyncIterable<T> {
  unsubscribe(max?: number): void;
  drain(): Promise<void>;
  isDraining(): boolean;
  isClosed(): boolean;
  callback(err: object | null, msg: NatsMsg): void;
  getSubject(): string;
  getReceived(): number;
  getProcessed(): number;
  getPending(): number;
  getID(): number;
  getMax(): number | undefined;
}

declare type Subscription = Sub<NatsMsg>;

declare enum Events {
  Disconnect = 'disconnect',
  Reconnect = 'reconnect',
  Update = 'update',
  LDM = 'ldm',
  Error = 'error',
}
interface Status {
  type: Events | DebugEvents;
  data: string | number;
}

declare enum DebugEvents {
  Reconnecting = 'reconnecting',
  PingTimer = 'pingTimer',
  StaleConnection = 'staleConnection',
}

export declare class Client {
  info?: Record<string, any>;
  closed(): Promise<void | Error>;
  close(): Promise<void>;
  publish(subject: string, data?: Uint8Array, options?: PublishOptions): void;
  subscribe(subject: string, opts?: SubscriptionOptions): Subscription;
  request(
    subject: string,
    data?: Uint8Array,
    opts?: RequestOptions,
  ): Promise<NatsMsg>;
  flush(): Promise<void>;
  drain(): Promise<void>;
  isClosed(): boolean;
  isDraining(): boolean;
  getServer(): string;
  status(): AsyncIterable<Status>;
  stats(): Record<string, any>;
  jetstreamManager(opts?: Record<string, any>): Promise<any>;
  jetstream(opts?: Record<string, any>): any;
}
