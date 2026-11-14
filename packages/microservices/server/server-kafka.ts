import { isUtf8 } from 'buffer';
import {
  defaultIfEmpty,
  finalize,
  isObservable,
  lastValueFrom,
  Observable,
  Subject,
} from 'rxjs';
import { NO_EVENT_HANDLER, NO_MESSAGE_HANDLER } from '../constants.js';
import { KafkaContext } from '../ctx-host/index.js';
import { KafkaRequestDeserializer } from '../deserializers/kafka-request.deserializer.js';
import { KafkaHeaders, Transport } from '../enums/index.js';
import { KafkaStatus } from '../events/index.js';
import { KafkaRetriableException } from '../exceptions/index.js';
import {
  BrokersFunction,
  Consumer,
  EachMessagePayload,
  IHeaders,
  Kafka,
  KafkaMessage,
  Message,
  Producer,
  RecordMetadata,
} from '../external/kafka.interface.js';
import { KafkaParser } from '../helpers/index.js';
import {
  KafkaOptions,
  MessageHandler,
  OutgoingResponse,
  ReadPacket,
  TransportId,
} from '../interfaces/index.js';
import { KafkaRequestSerializer } from '../serializers/kafka-request.serializer.js';
import {
  createKafkaClient,
  getKafkaIdentity,
} from '../utils/kafka-client.utils.js';
import { toPacketMetadata } from '../utils/packet-metadata.utils.js';
import { Server } from './server.js';
import { Logger } from '@nestjs/common';
import { isNil, isString } from '@nestjs/common/internal';

// Topic names the broker accepts
const KAFKA_TOPIC_NAME_REGEX = /^[a-zA-Z0-9._-]{1,249}$/;
// The errors the Kafka client tells by their name and never retries: a message
// handler that rejects with one of them stops the consumer, which is not
// restarted
const KAFKA_UNRECOVERABLE_ERRORS = [
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
];

/**
 * @publicApi
 */
export class ServerKafka extends Server<never, KafkaStatus> {
  // `handleEvent` awaits the stream, so the rejection reaches the Kafka client,
  // which logs it. A second report here would duplicate it.
  public override readonly propagatesEventHandlerErrors = true;
  public transportId: TransportId = Transport.KAFKA;

  protected logger = new Logger(ServerKafka.name);
  protected client: Kafka | null = null;
  protected consumer: Consumer | null = null;
  protected producer: Producer | null = null;
  protected parser: KafkaParser | null = null;
  protected brokers: readonly string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;
  protected postfixId: string;

  constructor(protected readonly options: Required<KafkaOptions>['options']) {
    super();

    this.postfixId = this.getOptionsProp(this.options, 'postfixId', '-server');

    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    const identity = getKafkaIdentity(this.options ?? {}, this.postfixId);
    this.brokers = identity.brokers;
    this.clientId = identity.clientId;
    this.groupId = identity.groupId;

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
    if (!(pattern instanceof RegExp)) {
      return super.addHandler(pattern, callback, isEventHandler, extras);
    }

    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    callback.isEventHandler = isEventHandler;
    callback.extras = extras;

    const key =
      [...messageHandlers.keys()].find(
        registered =>
          registered instanceof RegExp &&
          registered.source === pattern.source &&
          registered.flags === pattern.flags,
      ) ?? pattern;

    if (messageHandlers.has(key) && isEventHandler) {
      const headRef = messageHandlers.get(key)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
      messageHandlers.set(pattern, callback);
    }
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
    try {
      this.client = await this.createClient();
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public async close(): Promise<void> {
    // The consumer goes first: disconnecting it waits for the running message
    // handlers, which send their replies through the producer. The producer is
    // disconnected even when the consumer fails to.
    let consumerFailed = false;
    let consumerError: unknown;
    try {
      await this.consumer?.disconnect();
    } catch (err) {
      consumerFailed = true;
      consumerError = err;
    }
    try {
      await this.producer?.disconnect();
    } catch (err) {
      if (!consumerFailed) {
        throw err;
      }
      this.logger.error(err);
    } finally {
      this.consumer = null;
      this.producer = null;
      this.client = null;
    }
    if (consumerFailed) {
      throw consumerError;
    }
  }

  public async start(callback: () => void): Promise<void> {
    const consumerOptions = {
      ...(this.options.consumer || {}),
      groupId: this.groupId,
    };
    this.consumer = this.client!.consumer(consumerOptions);
    this.producer = this.client!.producer(this.options.producer);
    this.registerConsumerEventListeners();
    this.registerProducerEventListeners();

    await this.consumer.connect();
    await this.producer.connect();
    await this.bindEvents(this.consumer);
    callback();
  }

  protected registerConsumerEventListeners() {
    if (!this.consumer) {
      return;
    }
    this.consumer.on(this.consumer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this.consumer.on(this.consumer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
    this.consumer.on(this.consumer.events.REBALANCING, () =>
      this._status$.next(KafkaStatus.REBALANCING),
    );
    this.consumer.on(this.consumer.events.STOP, () =>
      this._status$.next(KafkaStatus.STOPPED),
    );
    this.consumer.on(this.consumer.events.CRASH, () =>
      this._status$.next(KafkaStatus.CRASHED),
    );
  }

  protected registerProducerEventListeners() {
    if (!this.producer) {
      return;
    }
    this.producer.on(this.producer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this.producer.on(this.producer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
  }

  public async createClient<T = any>(): Promise<T> {
    const { client, identity } = await createKafkaClient({
      options: this.options,
      identity: {
        brokers: this.brokers,
        clientId: this.clientId,
        groupId: this.groupId,
      },
      postfixId: this.postfixId,
      logger: this.logger,
      loadPackage: (name, loader) =>
        this.loadPackage(name, ServerKafka.name, loader),
    });
    this.brokers = identity.brokers;
    this.clientId = identity.clientId;
    this.groupId = identity.groupId;
    return client as T;
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};

    if (registeredPatterns.length > 0) {
      await this.consumer!.subscribe({
        ...consumerSubscribeOptions,
        topics: registeredPatterns,
      });
    }

    const consumerRunOptions = {
      ...(this.options.run || {}),
      eachMessage: this.getMessageHandler(),
    };
    await consumer.run(consumerRunOptions);
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const handler = super.getHandlerByPattern(pattern);
    if (handler) {
      return handler;
    }

    const route = this.getRouteFromPattern(pattern);
    const messageHandlers = this.messageHandlers as Map<
      string | RegExp,
      MessageHandler
    >;
    for (const [registeredPattern, registeredHandler] of messageHandlers) {
      if (
        registeredPattern instanceof RegExp &&
        this.isPatternMatch(registeredPattern, route)
      ) {
        return registeredHandler;
      }
    }

    return null;
  }

  /**
   * A regex pattern also matches the topic this server replies on
   * ("orders.created.reply"), so the server consumes its own replies. Those
   * are skipped unless the regex that matches them targets reply topics only.
   */
  private isOwnReply(
    topic: string,
    correlationId: unknown,
    replyTopic: unknown,
  ) {
    const replySuffix = '.reply';
    if (
      !topic.endsWith(replySuffix) ||
      isNil(correlationId) ||
      !isNil(replyTopic) ||
      super.getHandlerByPattern(topic)
    ) {
      return false;
    }
    const patterns = [...this.messageHandlers.keys()] as (string | RegExp)[];
    const pattern = patterns.find(
      key => key instanceof RegExp && this.isPatternMatch(key, topic),
    );
    return (
      pattern instanceof RegExp &&
      this.isPatternMatch(pattern, topic.slice(0, -replySuffix.length))
    );
  }

  /**
   * Whether a request may be answered on the reply topic it names. A reply is
   * published with the credentials of this server and has no envelope, so on
   * a topic this server handles it would run that topic's handlers as an
   * event (unless it is skipped as one of the server's own replies, see
   * `isOwnReply`). The Kafka client also keeps state per topic in plain objects, which
   * a topic named after an `Object.prototype` property (`__proto__`) reaches
   * through their prototype.
   */
  protected canReplyOn(replyTopic: string, correlationId: unknown): boolean {
    if (replyTopic in {}) {
      return false;
    }
    return (
      !this.getHandlerByPattern(replyTopic) ||
      this.isOwnReply(replyTopic, correlationId, undefined)
    );
  }

  private isPatternMatch(pattern: RegExp, route: string): boolean {
    pattern.lastIndex = 0;
    const isMatch = pattern.test(route);
    pattern.lastIndex = 0;
    return isMatch;
  }

  public getMessageHandler() {
    return async (payload: EachMessagePayload) => {
      try {
        return await this.handleMessage(payload);
      } catch (err) {
        throw this.toRetriableError(err);
      }
    };
  }

  /**
   * Returns what the `eachMessage` callback rejects with when handling a
   * message failed with `err`.
   *
   * The Kafka client delivers a message again when its handler rejects, and restarts
   * the consumer once the retries are exhausted, except for the errors it
   * takes for a bug in its own code: one message failing with one of those
   * would leave the consumer stopped, for every topic. An exception filter
   * that throws (as one written for HTTP does when given an RPC context) or
   * that passes on the handler's own error rejects with such an error, so it
   * reaches the Kafka client as a plain error with the same message and stack, and the
   * original error as its cause.
   */
  private toRetriableError(err: any): unknown {
    if (!KAFKA_UNRECOVERABLE_ERRORS.includes(err?.name)) {
      return err;
    }
    const retriableError = new Error(err.message, { cause: err });
    retriableError.stack = err.stack;
    return retriableError;
  }

  public getPublisher(
    replyTopic: string,
    replyPartition: string,
    correlationId: string,
    context: KafkaContext,
  ): (data: any) => Promise<RecordMetadata[]> {
    return (data: any) =>
      this.sendMessage(
        data,
        replyTopic,
        replyPartition,
        correlationId,
        context,
      );
  }

  /**
   * Handles a message received by the consumer.
   *
   * A message with the `kafka_correlationId` and `kafka_replyTopic` headers,
   * which `ClientKafka#send()` adds, is a request: what its handler responds
   * with, an error included, is published to the reply topic. Any other
   * message is handled as an event (see `handleEvent`), also when its
   * handler is a `@MessagePattern()` one, so that such handlers can consume
   * topics written by producers that do not add these headers. The server's
   * own replies that a regex pattern matches are skipped (see `isOwnReply`).
   */
  public async handleMessage(payload: EachMessagePayload) {
    const channel = payload.topic;
    let rawMessage: KafkaMessage;
    try {
      rawMessage = this.parser!.parse<KafkaMessage>(
        Object.assign(payload.message, {
          topic: payload.topic,
          partition: payload.partition,
        }),
      );
    } catch (err) {
      // A rejection would make the Kafka client redeliver the message forever
      return this.logger.error(
        `Message skipped (topic "${channel}", partition ${payload.partition}, offset ${payload.message.offset}): ${err.message}`,
      );
    }
    const headers = rawMessage.headers as unknown as Record<string, any>;
    const correlationId = headers[KafkaHeaders.CORRELATION_ID];
    const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
    const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];
    if (this.isOwnReply(channel, correlationId, replyTopic)) {
      return;
    }

    const packet = await this.deserializer.deserialize(rawMessage, { channel });
    const kafkaContext = new KafkaContext([
      rawMessage,
      payload.partition,
      payload.topic,
      this.consumer!,
      payload.heartbeat,
      this.producer!,
      this.readMetadata(payload.message.headers),
    ]);
    const handler = this.getHandlerByPattern(packet.pattern);
    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      return this.handleEvent(packet.pattern, packet, kafkaContext);
    }
    // The sender picks the correlation id too, and every reply carries a copy
    // of it, so it is held to the limit the other transports put on an id
    try {
      this.assertValidPacketId(correlationId);
    } catch (err) {
      // A rejection would make the Kafka client redeliver the message forever
      return this.logger.error(
        `The correlation id of the message is not valid (${err.message}), so it cannot be answered and has been dropped. Message pattern: ${packet.pattern}`,
      );
    }
    // The sender picks the reply topic. The Kafka client keeps every topic a producer
    // is asked to send to, so one it cannot encode (such as a name longer
    // than a Kafka string) would fail every later reply of the producer too.
    if (!isString(replyTopic) || !KAFKA_TOPIC_NAME_REGEX.test(replyTopic)) {
      return this.logger.error(
        `The reply topic of the message is not a valid topic name, so it cannot be answered and has been dropped. Message pattern: ${packet.pattern}`,
      );
    }
    if (!this.canReplyOn(replyTopic, correlationId)) {
      return this.logger.error(
        `The reply topic of the message is one this server does not reply on, so it cannot be answered and has been dropped. Message pattern: ${packet.pattern}`,
      );
    }

    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
      kafkaContext,
    );

    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
      });
    }
    return this.handleRequest(
      kafkaContext,
      async () => {
        const response$ = this.transformToObservable(
          handler(packet.data, kafkaContext),
        );

        const replyStream$ =
          await this.combineStreamsAndThrowIfRetriable(response$);
        // Requesters have always received null for a stream that completes
        // without emitting, so it still replies with an undefined response
        return replyStream$.pipe(defaultIfEmpty(undefined));
      },
      publish,
    );
  }

  /**
   * Reads the packet metadata off the headers of a message as the broker
   * delivered them, before the parser decodes them: every header with a
   * single value that is UTF-8 text. A repeated header (an array) or one with
   * binary content has no `PacketMetadata` form.
   */
  protected readMetadata(headers: IHeaders | undefined) {
    return toPacketMetadata(
      Object.entries(headers ?? {}).map(([key, value]) => [
        key,
        Buffer.isBuffer(value) && isUtf8(value) ? value.toString() : value,
      ]),
    );
  }

  // A retriable exception makes the Kafka client redeliver the message, and it is the
  // redelivered message that gets answered
  protected override shouldAnswerRejectedRequest(err: unknown): boolean {
    return !(err instanceof KafkaRetriableException);
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return [this.client, this.consumer, this.producer] as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method is not supported for Kafka server');
  }

  /**
   * Subscribes to the response of a request and settles once it emits, fails
   * or completes. A retriable exception that comes before any value rejects,
   * which makes the Kafka client deliver the message again; otherwise it resolves with
   * the stream to reply with.
   *
   * That stream is subscribed to after the response, so it replays what the
   * response emitted until then, once. Later values are only passed on: a
   * long stream is not kept in memory until it completes.
   */
  private combineStreamsAndThrowIfRetriable(response$: Observable<any>) {
    return new Promise<Observable<unknown>>((resolve, reject) => {
      let isPromiseResolved = false;
      let pendingValues: unknown[] | null = [];
      const stream$ = new Subject<unknown>();
      const replyStream$ = new Observable<unknown>(subscriber => {
        const values = pendingValues ?? [];
        // A value emitted while these are replayed is appended to them
        for (let i = 0; i < values.length && !subscriber.closed; i++) {
          subscriber.next(values[i]);
        }
        pendingValues = null;
        // A subject that has failed or completed tells a late subscriber so
        return stream$.subscribe(subscriber);
      });
      const settle = () => {
        if (!isPromiseResolved) {
          isPromiseResolved = true;
          resolve(replyStream$);
        }
      };
      response$.subscribe({
        next: val => {
          if (pendingValues) {
            pendingValues.push(val);
          } else {
            stream$.next(val);
          }
          settle();
        },
        error: err => {
          if (err instanceof KafkaRetriableException && !isPromiseResolved) {
            isPromiseResolved = true;
            reject(err);
          } else {
            settle();
          }
          stream$.error(err);
        },
        complete: () => {
          stream$.complete();
          // A stream that completes without emitting must still settle the
          // promise, or the handler never publishes and the span never closes.
          settle();
        },
      });
    });
  }

  public async sendMessage(
    message: OutgoingResponse,
    replyTopic: string,
    replyPartition: string | undefined | null,
    correlationId: string,
    context: KafkaContext,
  ): Promise<RecordMetadata[]> {
    const outgoingMessage = await this.serializer.serialize(message.response);
    // The headers of a reply can come from the request (as with a handler
    // that returns what it received), and a reply topic among them would make
    // the reply read as a request to whoever consumes it
    delete outgoingMessage.headers?.[KafkaHeaders.REPLY_TOPIC];
    delete outgoingMessage.headers?.[KafkaHeaders.REPLY_PARTITION];
    this.assignReplyPartition(replyPartition, outgoingMessage);
    this.assignCorrelationIdHeader(correlationId, outgoingMessage);
    this.assignErrorHeader(message, outgoingMessage);
    this.assignIsDisposedHeader(message, outgoingMessage);

    const replyMessage = {
      topic: replyTopic,
      messages: [outgoingMessage],
      ...(this.options.send || {}),
    };
    return this.producer!.send(replyMessage);
  }

  public assignIsDisposedHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
    if (!outgoingResponse.isDisposed) {
      return;
    }
    outgoingMessage.headers![KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
    // A completion that comes after the replies have been produced is sent on
    // its own, and its null value must not reach the requester as a response
    if (!('response' in outgoingResponse) && !outgoingResponse.err) {
      outgoingMessage.headers![KafkaHeaders.NEST_NO_RESPONSE] = Buffer.alloc(1);
    }
  }

  public assignErrorHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
    if (!outgoingResponse.err) {
      return;
    }
    const stringifiedError =
      typeof outgoingResponse.err === 'object'
        ? JSON.stringify(outgoingResponse.err)
        : outgoingResponse.err;
    outgoingMessage.headers![KafkaHeaders.NEST_ERR] =
      Buffer.from(stringifiedError);
  }

  public assignCorrelationIdHeader(
    correlationId: string,
    outgoingMessage: Message,
  ) {
    outgoingMessage.headers![KafkaHeaders.CORRELATION_ID] =
      Buffer.from(correlationId);
  }

  public assignReplyPartition(
    replyPartition: string | null | undefined,
    outgoingMessage: Message,
  ) {
    if (isNil(replyPartition)) {
      return;
    }
    outgoingMessage.partition = parseFloat(replyPartition);
  }

  /**
   * Handles a message as an event: one for an `@EventPattern()` handler, or
   * one without the reply headers (see `handleMessage`).
   *
   * The returned promise settles once the stream the handler returns
   * completes, and the Kafka client only then moves on to the next message of the
   * partition, so a handler whose stream does not complete holds the
   * partition. A handler that fails (as when a guard or a pipe rejects the
   * message) rejects into the Kafka client, which does not commit the message and
   * delivers it again: it retries it, and once its retries are exhausted it
   * restarts the consumer from the last committed offset. Handlers of topics
   * that other producers write to should complete their streams, and should
   * not fail on messages they cannot process unless these are to be
   * delivered again.
   */
  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: KafkaContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }

    return this.runWithProcessingHooks(context, async runEndHook => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        await lastValueFrom(resultOrStream.pipe(finalize(runEndHook)), {
          defaultValue: undefined,
        });
      } else {
        runEndHook();
      }
    });
  }

  protected initializeSerializer(options: KafkaOptions['options']) {
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
  }

  protected initializeDeserializer(options: KafkaOptions['options']) {
    this.deserializer = options?.deserializer ?? new KafkaRequestDeserializer();
  }
}
