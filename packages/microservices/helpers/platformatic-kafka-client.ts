import { EventEmitter } from 'events';
import { setTimeout as delay } from 'timers/promises';
import type {
  IHeaders,
  Message as KafkajsMessage,
} from '../external/kafka.interface.js';
import type * as Platformatic from '../external/platformatic-kafka.interface.js';
import type { PlatformaticKafkaMessage } from '../interfaces/kafka-driver-types.interface.js';
import type { KafkaReplyPartitionAssigner } from './kafka-reply-partition-assigner.js';
import { LoggerService } from '@nestjs/common';

const CONSUMER_EVENTS = {
  CONNECT: 'consumer.connect',
  DISCONNECT: 'consumer.disconnect',
  GROUP_JOIN: 'consumer.group_join',
  REBALANCING: 'consumer.rebalancing',
  STOP: 'consumer.stop',
  CRASH: 'consumer.crash',
} as const;

const PRODUCER_EVENTS = {
  CONNECT: 'producer.connect',
  DISCONNECT: 'producer.disconnect',
} as const;

// The delays before a failed message is delivered again, as kafkajs retries
const INITIAL_RETRY_DELAY_MS = 300;
const MAX_RETRY_DELAY_MS = 30_000;

// The protocol kafkajs consumers join their group with by default. Joining
// with its name, the round-robin assigner of `@platformatic/kafka` lets
// servers on either client library share a consumer group.
const KAFKAJS_ROUND_ROBIN_PROTOCOL = { name: 'RoundRobinAssigner', version: 0 };

// `@platformatic/kafka` sends the heartbeats of the consumer itself
const noopHeartbeat = async () => undefined;

type ReplyPartitionAssignerFactory = (
  config?: ConstructorParameters<typeof KafkaReplyPartitionAssigner>[1],
) => KafkaReplyPartitionAssigner;

export type PlatformaticConsumerConfig =
  Partial<Platformatic.ConsumerOwnOptions> & {
    groupId: string;
    /** The reply partition assigner of ClientKafka, which passes one. */
    partitionAssigners?: ReplyPartitionAssignerFactory[];
  };

export interface PlatformaticEachMessagePayload {
  topic: string;
  partition: number;
  message: PlatformaticKafkaMessage;
  heartbeat(): Promise<void>;
}

type EachMessage = (
  payload: PlatformaticEachMessagePayload,
) => Promise<unknown>;

/**
 * The `@platformatic/kafka` consumer or producer that a Kafka server or client
 * runs on, or the kafkajs one as it is.
 */
export function unwrapKafkaInstance<T>(instance: T): T {
  return instance instanceof PlatformaticConsumer ||
    instance instanceof PlatformaticProducer
    ? (instance.native as T)
    : instance;
}

/**
 * Runs the Kafka transport on `@platformatic/kafka`. ServerKafka and
 * ClientKafka drive their consumer and producer through the parts of the
 * kafkajs API they use (`connect()`, `subscribe()`, `run()`, `send()`, the
 * events...), so this client creates `@platformatic/kafka` consumers and
 * producers with that API, as the `Kafka` class of kafkajs does. Application
 * code gets the `@platformatic/kafka` ones (see `unwrapKafkaInstance`).
 */
export class PlatformaticKafkaClient {
  constructor(
    private readonly kafkaPackage: any,
    private readonly options: Platformatic.BaseOptions,
    private readonly logger: LoggerService,
  ) {}

  public consumer(config: PlatformaticConsumerConfig): PlatformaticConsumer {
    return new PlatformaticConsumer(
      this.kafkaPackage,
      this.options,
      config,
      this.logger,
    );
  }

  public producer(config?: Platformatic.ProduceOptions): PlatformaticProducer {
    return new PlatformaticProducer(this.kafkaPackage, this.options, config);
  }
}

export class PlatformaticConsumer extends EventEmitter {
  public readonly events = CONSUMER_EVENTS;
  public readonly native: Platformatic.Consumer;
  private topics: (string | RegExp)[] = [];
  private fallbackMode: Platformatic.MessagesStreamFallbackMode = 'latest';
  private consumeLoop: Promise<void> | null = null;
  private readonly stopController = new AbortController();

  constructor(
    private readonly kafkaPackage: any,
    private readonly options: Platformatic.BaseOptions,
    { partitionAssigners, ...config }: PlatformaticConsumerConfig,
    private readonly logger: LoggerService,
  ) {
    super();
    this.native = new kafkaPackage.Consumer({
      ...options,
      ...(config.groupProtocol !== 'consumer' &&
        toGroupOptions(partitionAssigners?.[0])),
      ...config,
    });
    // Emitted when the consumer fails to rejoin its group: unhandled, it would
    // crash the process
    this.native.on('error', (err: unknown) => this.reportCrash(err));
    this.native.on(
      'consumer:group:join',
      ({ groupId, memberId, isLeader, assignments }) =>
        this.emit(CONSUMER_EVENTS.GROUP_JOIN, {
          type: CONSUMER_EVENTS.GROUP_JOIN,
          timestamp: Date.now(),
          payload: {
            groupId,
            memberId,
            isLeader,
            memberAssignment: Object.fromEntries(
              (assignments ?? []).map(({ topic, partitions }) => [
                topic,
                partitions,
              ]),
            ),
          },
        }),
    );
    this.native.on('consumer:group:rebalance', () =>
      this.emit(CONSUMER_EVENTS.REBALANCING),
    );
  }

  private get stopSignal(): AbortSignal {
    return this.stopController.signal;
  }

  public async connect(): Promise<void> {
    await this.native.metadata({ topics: [] });
    this.emit(CONSUMER_EVENTS.CONNECT);
  }

  public async subscribe({
    topics,
    fromBeginning,
    fallbackMode,
  }: Pick<Platformatic.StreamOptions, 'fallbackMode'> & {
    topics: (string | RegExp)[];
    fromBeginning?: boolean;
  }): Promise<void> {
    this.topics.push(...topics);
    this.fallbackMode = fallbackMode ?? (fromBeginning ? 'earliest' : 'latest');
  }

  /**
   * Starts handing the messages of the subscribed topics to `eachMessage`, one
   * at a time. It resolves once the consumer has joined its group. As on
   * kafkajs, the offset of a message is committed once `eachMessage` resolves,
   * and a message it rejects is delivered again.
   */
  public async run({
    eachMessage,
    autoCommit = true,
  }: {
    eachMessage: EachMessage;
    autoCommit?: boolean;
  }): Promise<void> {
    const topics = await this.resolveTopics();
    const stream = await this.openStream(topics);
    this.consumeLoop = this.consume(topics, stream, eachMessage, autoCommit);
  }

  public async commitOffsets(
    offsets: Platformatic.CommitOptionsPartition[],
  ): Promise<void> {
    await this.native.commit({ offsets });
  }

  /**
   * Stops handing messages once the one being handled has settled, then
   * leaves the group.
   */
  public async disconnect(): Promise<void> {
    this.stopController.abort();
    try {
      await this.consumeLoop;
      await this.native.close();
    } finally {
      this.emit(CONSUMER_EVENTS.DISCONNECT);
    }
  }

  /**
   * The topics to consume. A regex matches the topics that exist when the
   * consumer runs, as on kafkajs.
   */
  private async resolveTopics(): Promise<string[]> {
    const topics = new Set(
      this.topics.filter(
        (topic): topic is string => !(topic instanceof RegExp),
      ),
    );
    const patterns = this.topics.filter(topic => topic instanceof RegExp);
    if (patterns.length > 0) {
      const admin = new this.kafkaPackage.Admin(this.options);
      try {
        const existingTopics: string[] = await admin.listTopics();
        for (const topic of existingTopics) {
          if (patterns.some(pattern => matches(pattern, topic))) {
            topics.add(topic);
          }
        }
      } finally {
        await admin.close();
      }
    }
    return [...topics];
  }

  /**
   * Opens a stream from the committed offsets, so that a stream opened after a
   * failure delivers the failed message again.
   */
  private async openStream(
    topics: string[],
  ): Promise<Platformatic.MessagesStream> {
    const stream = await this.native.consume({
      mode: 'committed',
      fallbackMode: this.fallbackMode,
      topics,
      autocommit: false,
    });
    // An error that comes while a message is being handled is read off the
    // stream by the next `readMessage()`; unhandled, it would crash the process
    stream.on('error', () => undefined);
    // With a 'readable' listener, the `resume()` that `@platformatic/kafka`
    // calls after a rebalance does not switch the stream to flowing mode,
    // which would drop the messages fetched while one is being handled
    stream.on('readable', () => undefined);
    return stream;
  }

  /**
   * Runs until the consumer stops. Once a message or the stream fails, it
   * waits, then opens a new stream.
   */
  private async consume(
    topics: string[],
    firstStream: Platformatic.MessagesStream,
    eachMessage: EachMessage,
    autoCommit: boolean,
  ): Promise<void> {
    let stream: Platformatic.MessagesStream | null = firstStream;
    let failedAttempts = 0;
    while (!this.stopSignal.aborted) {
      if (stream) {
        const hasHandledMessages = await this.consumeStream(
          stream,
          eachMessage,
          autoCommit,
        );
        if (hasHandledMessages) {
          failedAttempts = 0;
        }
      }
      if (this.stopSignal.aborted) {
        break;
      }
      failedAttempts++;
      await delay(
        Math.min(
          INITIAL_RETRY_DELAY_MS * 2 ** (failedAttempts - 1),
          MAX_RETRY_DELAY_MS,
        ),
        undefined,
        { signal: this.stopSignal },
      ).catch(() => undefined);
      if (this.stopSignal.aborted) {
        break;
      }
      // The new stream is opened before the old one is closed, so that the
      // consumer keeps its topics and its group does not rebalance
      const previousStream: Platformatic.MessagesStream | null = stream;
      stream = await this.openStream(topics).catch(err => {
        this.logger.error(`The consumer could not restart: ${err}`);
        return null;
      });
      if (previousStream) {
        await closeStream(previousStream);
      }
    }
    if (stream) {
      await closeStream(stream);
    }
    this.emit(CONSUMER_EVENTS.STOP);
  }

  /**
   * Hands the messages of a stream to `eachMessage` until the consumer stops,
   * the stream fails or `eachMessage` rejects. The offsets of the messages
   * handled are committed before it returns.
   *
   * @returns Whether a message was handled.
   */
  private async consumeStream(
    stream: Platformatic.MessagesStream,
    eachMessage: EachMessage,
    autoCommit: boolean,
  ): Promise<boolean> {
    const pendingCommits = new Set<Promise<void>>();
    let hasHandledMessages = false;
    try {
      while (!this.stopSignal.aborted) {
        let message: Platformatic.Message | undefined;
        try {
          message = await readMessage(stream, this.stopSignal);
        } catch (err) {
          this.reportCrash(err);
          return hasHandledMessages;
        }
        if (!message) {
          if (!this.stopSignal.aborted) {
            this.reportCrash(new Error('The stream of messages ended'));
          }
          return hasHandledMessages;
        }
        try {
          await eachMessage({
            topic: message.topic,
            partition: message.partition,
            message: toKafkaMessage(message),
            heartbeat: noopHeartbeat,
          });
        } catch (err) {
          this.logger.error(
            `Failed to handle a message, which will be delivered again: ${err}`,
          );
          return hasHandledMessages;
        }
        hasHandledMessages = true;
        if (autoCommit) {
          const commit = Promise.resolve(message.commit()).catch(err =>
            this.logger.error(`Failed to commit an offset: ${err}`),
          );
          pendingCommits.add(commit);
          void commit.finally(() => pendingCommits.delete(commit));
        }
      }
      return hasHandledMessages;
    } finally {
      await waitForCommits(stream, pendingCommits);
    }
  }

  private reportCrash(err: unknown) {
    this.logger.error(`The consumer crashed: ${err}`);
    this.emit(CONSUMER_EVENTS.CRASH, {
      type: CONSUMER_EVENTS.CRASH,
      payload: { error: err, groupId: this.native.groupId },
    });
  }
}

export class PlatformaticProducer extends EventEmitter {
  public readonly events = PRODUCER_EVENTS;
  public readonly native: Platformatic.Producer;

  constructor(
    kafkaPackage: any,
    options: Platformatic.BaseOptions,
    config?: Platformatic.ProduceOptions,
  ) {
    super();
    this.native = new kafkaPackage.Producer({ ...options, ...config });
  }

  public async connect(): Promise<void> {
    await this.native.metadata({ topics: [] });
    this.emit(PRODUCER_EVENTS.CONNECT);
  }

  public async disconnect(): Promise<void> {
    try {
      await this.native.close();
    } finally {
      this.emit(PRODUCER_EVENTS.DISCONNECT);
    }
  }

  public send({
    topic,
    messages,
    ...options
  }: Platformatic.ProduceOptions & {
    topic: string;
    messages: KafkajsMessage[];
  }): Promise<Platformatic.ProduceResult> {
    return this.native.send({
      ...options,
      messages: messages.map(message => toMessageToProduce(topic, message)),
    });
  }
}

/**
 * Waits for the commits of the messages handled. A stream closed meanwhile
 * (by a failed commit, for one) settles no commit any more.
 */
async function waitForCommits(
  stream: Platformatic.MessagesStream,
  pendingCommits: Set<Promise<void>>,
): Promise<void> {
  if (pendingCommits.size === 0 || stream.destroyed) {
    return;
  }
  let onClose!: () => void;
  const closed = new Promise<void>(resolve => {
    onClose = resolve;
    stream.once('close', onClose);
  });
  await Promise.race([Promise.all(pendingCommits), closed]);
  stream.off('close', onClose);
}

/**
 * Closes a stream, dropping the messages it fetched and nobody read, which are
 * not committed. A destroyed stream (one that failed) is closed already, and
 * `close()` would wait for it forever.
 */
async function closeStream(stream: Platformatic.MessagesStream): Promise<void> {
  if (stream.destroyed) {
    return;
  }
  // The stream only closes once it has ended, which takes reading it out in
  // flowing mode, which no 'readable' listener may hold back
  stream.removeAllListeners('readable');
  const closing = stream.close();
  stream.resume();
  await closing.catch(() => undefined);
}

/**
 * Reads the next message of a stream. It resolves with `undefined` once the
 * stream has ended or the consumer stops.
 */
function readMessage(
  stream: Platformatic.MessagesStream,
  stopSignal: AbortSignal,
): Promise<Platformatic.Message | undefined> {
  return new Promise((resolve, reject) => {
    if (stream.errored) {
      return reject(stream.errored);
    }
    if (stopSignal.aborted || stream.readableEnded || stream.destroyed) {
      return resolve(undefined);
    }
    const cleanup = () => {
      stream.off('readable', onReadable);
      stream.off('end', onEnd);
      stream.off('close', onEnd);
      stream.off('error', onError);
      stopSignal.removeEventListener('abort', onEnd);
    };
    const onReadable = () => {
      const message = stream.read();
      if (message !== null) {
        cleanup();
        resolve(message);
      }
    };
    const onEnd = () => {
      cleanup();
      resolve(undefined);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    stream.on('readable', onReadable);
    stream.on('end', onEnd);
    stream.on('close', onEnd);
    stream.on('error', onError);
    stopSignal.addEventListener('abort', onEnd, { once: true });
    onReadable();
  });
}

/**
 * The group options of a consumer: those that run the reply partition
 * assigner of ClientKafka, or else those that let it share a group with
 * kafkajs consumers.
 */
function toGroupOptions(
  assignerFactory: ReplyPartitionAssignerFactory | undefined,
): Pick<
  Platformatic.GroupOptions,
  'protocols' | 'protocolsMetadata' | 'partitionAssigner'
> {
  if (!assignerFactory) {
    return { protocols: [KAFKAJS_ROUND_ROBIN_PROTOCOL] };
  }
  // `@platformatic/kafka` encodes the group protocol itself: the assigner
  // gives the user data of the member, and assigns the partitions of the
  // cluster metadata from the user data of every member
  const assigner = assignerFactory();
  return {
    protocols: [{ name: assigner.name, version: assigner.version }],
    protocolsMetadata: () => assigner.getUserData(),
    partitionAssigner: (_current, members, topics, metadata) => {
      const topicsPartitions = [...topics].flatMap(topic =>
        Array.from(
          { length: metadata.topics.get(topic)?.partitionsCount ?? 0 },
          (_, partitionId) => ({ topic, partitionId }),
        ),
      );
      const assignment = assigner.assignPartitions(
        [...members.values()].map(({ memberId, metadata: userData }) => ({
          memberId,
          userData,
        })),
        [...topics],
        topicsPartitions,
      );
      return Object.entries(assignment).map(([memberId, partitions]) => ({
        memberId,
        assignments: new Map(
          Object.entries(partitions).map(([topic, topicPartitions]) => [
            topic,
            { topic, partitions: topicPartitions },
          ]),
        ),
      }));
    },
  };
}

function toKafkaMessage(
  message: Platformatic.Message,
): PlatformaticKafkaMessage {
  // No prototype, so that a header named after one of its properties
  // ("constructor", "__proto__") is read as a header
  const headers: IHeaders = Object.create(null);
  for (const [key, value] of message.headerEntries) {
    const name = String(key ?? '');
    const previous = headers[name];
    // A repeated header has its values in an array, as on kafkajs
    if (previous === undefined) {
      headers[name] = value;
    } else if (Array.isArray(previous)) {
      previous.push(value);
    } else {
      headers[name] = [previous, value];
    }
  }
  return {
    key: message.key ?? null,
    value: message.value ?? null,
    headers,
    offset: message.offset,
    timestamp: message.timestamp,
    leaderEpoch: message.leaderEpoch,
  };
}

function toMessageToProduce(
  topic: string,
  { key, value, headers, partition, timestamp }: KafkajsMessage,
): Platformatic.MessageToProduce {
  const producedHeaders = new Map<Buffer, Buffer>();
  for (const [name, headerValue] of Object.entries(headers ?? {})) {
    // Distinct keys, so that a Map can hold a repeated header
    for (const item of Array.isArray(headerValue)
      ? headerValue
      : [headerValue]) {
      if (item !== undefined) {
        producedHeaders.set(Buffer.from(name), toBuffer(item)!);
      }
    }
  }
  return {
    topic,
    key: toBuffer(key),
    value: toBuffer(value) ?? null,
    headers: producedHeaders,
    ...(partition !== undefined && { partition }),
    ...(timestamp !== undefined && { timestamp: BigInt(timestamp) }),
  };
}

function toBuffer(value: Buffer | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function matches(pattern: RegExp, topic: string): boolean {
  pattern.lastIndex = 0;
  const isMatch = pattern.test(topic);
  pattern.lastIndex = 0;
  return isMatch;
}
