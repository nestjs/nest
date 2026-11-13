import {
  throwError as _throw,
  connectable,
  defer,
  Observable,
  Subject,
} from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants.js';
import { KafkaResponseDeserializer } from '../deserializers/kafka-response.deserializer.js';
import { KafkaHeaders } from '../enums/index.js';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception.js';
import { InvalidMessageException } from '../errors/invalid-message.exception.js';
import { KafkaStatus } from '../events/index.js';
import {
  BrokersFunction,
  Consumer,
  ConsumerConfig,
  ConsumerGroupJoinEvent,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  KafkaMessage,
  Producer,
  TopicPartitionOffsetAndMetadata,
} from '../external/kafka.interface.js';
import {
  KafkaLogger,
  KafkaParser,
  KafkaReplyPartitionAssigner,
} from '../helpers/index.js';
import {
  ClientKafkaProxy,
  IncomingResponse,
  KafkaOptions,
  MsPattern,
  OutgoingEvent,
  PacketMetadata,
  ReadPacket,
  WritePacket,
} from '../interfaces/index.js';
import {
  KafkaRequest,
  KafkaRequestSerializer,
} from '../serializers/kafka-request.serializer.js';
import { hasPacketMetadata } from '../utils/packet-metadata.utils.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackage, isNil, isUndefined } from '@nestjs/common/internal';

/**
 * The consumer and producer created by a single `connect()` attempt, kept so a
 * failed attempt can disconnect its own instances even after a newer attempt
 * has replaced them on the client.
 */
interface KafkaConnectionAttempt {
  consumer?: Consumer;
  producer?: Producer;
}

/**
 * @publicApi
 */
export class ClientKafka
  extends ClientProxy<never, KafkaStatus>
  implements ClientKafkaProxy
{
  protected logger = new Logger(ClientKafka.name);
  protected client: Kafka | null = null;
  protected parser: KafkaParser | null = null;
  protected initialized: Promise<void> | null = null;
  /**
   * The attempt allowed to keep writing the client's state, or null once
   * `close()` has taken the client over. Every step of a connection attempt
   * checks it after an await, so an attempt that outlives `close()` stops
   * instead of reading the fields `close()` has already cleared.
   */
  protected connectionAttempt: KafkaConnectionAttempt | null = null;
  protected responsePatterns: string[] = [];
  protected consumerAssignments: { [key: string]: number } = {};
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;
  protected producerOnlyMode: boolean;
  protected _consumer: Consumer | null = null;
  protected _producer: Producer | null = null;

  get consumer(): Consumer {
    if (!this._consumer) {
      throw new Error(
        'No consumer initialized. Please, call the "connect" method first.',
      );
    }
    return this._consumer;
  }

  get producer(): Producer {
    if (!this._producer) {
      throw new Error(
        'No producer initialized. Please, call the "connect" method first.',
      );
    }
    return this._producer;
  }

  constructor(protected readonly options: Required<KafkaOptions>['options']) {
    super();

    const clientOptions = this.getOptionsProp(
      this.options,
      'client',
      {} as KafkaConfig,
    );
    const consumerOptions = this.getOptionsProp(
      this.options,
      'consumer',
      {} as ConsumerConfig,
    );
    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-client');
    this.producerOnlyMode = this.getOptionsProp(
      this.options,
      'producerOnlyMode',
      false,
    );

    this.brokers = clientOptions.brokers || [KAFKA_DEFAULT_BROKER];

    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + postfixId;
    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public subscribeToResponseOf(pattern: unknown): void {
    const request = this.normalizePattern(pattern as MsPattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this.handleClose();
    // Invalidate an in-flight `connect()` before its instances are torn down,
    // so the attempt stops at its next step instead of continuing on a closed
    // client.
    this.connectionAttempt = null;
    try {
      // Both clients have to be disconnected even if one of them fails, so a
      // consumer does not stay in its group when the producer cannot be closed.
      const results = await Promise.allSettled([
        this._producer?.disconnect(),
        this._consumer?.disconnect(),
      ]);
      const [failure, ...otherFailures] = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      otherFailures.forEach(({ reason }) => this.logger.error(reason));
      if (failure) {
        throw failure.reason;
      }
    } finally {
      // The state must be reset even when a disconnect throws, otherwise a
      // later `connect()` reuses the cached `initialized` promise and hands
      // back the closed producer.
      this._producer = null;
      this._consumer = null;
      this.initialized = null;
      this.client = null;
    }
  }

  public handleClose() {
    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      const callbacks = [...this.routingMap.values()];
      this.routingMap.clear();

      for (const callback of callbacks) {
        try {
          callback({ err });
        } catch (callbackErr) {
          // A failing callback must not keep the remaining requests pending
          // nor prevent the connection from being closed.
          this.logger.error(callbackErr);
        }
      }
    }
  }

  public async connect(): Promise<Producer> {
    if (this.initialized) {
      return this.initialized.then(() => this._producer!);
    }
    const attempt: KafkaConnectionAttempt = {};
    // Claim the client before the attempt starts, so a `close()` or a newer
    // `connect()` can invalidate it at any later point.
    this.connectionAttempt = attempt;
    const initialized = this.initializeClientAndConnections(attempt).catch(
      async err => {
        // A rejected attempt must not be cached: the next `connect()` call
        // has to try again once the broker is reachable, instead of failing
        // forever with the error of the first attempt.
        await this.discardPartialConnection(attempt, initialized);
        throw err;
      },
    );
    this.initialized = initialized;
    return initialized.then(() => this._producer!);
  }

  /**
   * Tears down whatever a failed connection attempt managed to create, so a
   * consumer that joined its group before the producer failed does not stay
   * behind when the next attempt creates a new one. The client's state is only
   * reset if no newer attempt has replaced it in the meantime (e.g., `close()`
   * followed by `connect()` while the failed attempt was still pending).
   */
  private async discardPartialConnection(
    attempt: KafkaConnectionAttempt,
    initialized: Promise<void>,
  ): Promise<void> {
    if (this.connectionAttempt === attempt) {
      this.connectionAttempt = null;
    }
    if (this.initialized === initialized) {
      this._consumer = null;
      this._producer = null;
      this.client = null;
      this.initialized = null;
    }
    // Otherwise `close()` or a newer attempt owns the client's state now: this
    // attempt stops before it publishes a field again, so only the instances
    // it created are left to disconnect.
    await Promise.allSettled([
      attempt.consumer?.disconnect(),
      attempt.producer?.disconnect(),
    ]);
  }

  /**
   * Stops an attempt once `close()` or a newer `connect()` has taken the
   * client over. Without it an attempt that outlives `close()` keeps going:
   * it reads `client`, `_consumer` or `_producer` after the await during which
   * `close()` cleared them, and rejects with a `TypeError` long after
   * `close()` returned.
   */
  private assertConnectionIsActive(attempt: KafkaConnectionAttempt): void {
    if (this.connectionAttempt !== attempt) {
      throw new Error('Connection closed');
    }
  }

  private async initializeClientAndConnections(
    attempt: KafkaConnectionAttempt,
  ): Promise<void> {
    const client = await this.createClient();
    // `close()` may have run while the Kafka client was being created: stop
    // before publishing it, so a closed client is not left holding one.
    this.assertConnectionIsActive(attempt);
    this.client = client;

    if (!this.producerOnlyMode) {
      const partitionAssigners = [
        (
          config: ConstructorParameters<typeof KafkaReplyPartitionAssigner>[1],
        ) => new KafkaReplyPartitionAssigner(this, config),
      ];

      const consumerOptions = {
        partitionAssigners,
        ...(this.options.consumer || {}),
        groupId: this.groupId,
      };

      const consumer = (attempt.consumer = client.consumer(consumerOptions));
      this._consumer = consumer;
      this.registerConsumerEventListeners();

      // Set member assignments on join and rebalance
      consumer.on(
        consumer.events.GROUP_JOIN,
        this.setConsumerAssignments.bind(this),
      );
      await consumer.connect();
      // `close()` disconnects the consumer while it connects; the attempt has
      // to stop instead of binding topics to the closed consumer.
      this.assertConnectionIsActive(attempt);
      await this.bindTopics();
      this.assertConnectionIsActive(attempt);
    }

    const producer = (attempt.producer = client.producer(
      this.options.producer || {},
    ));
    this.assertConnectionIsActive(attempt);
    this._producer = producer;
    this.registerProducerEventListeners();
    await producer.connect();
    // `close()` may have run while the producer was connecting.
    this.assertConnectionIsActive(attempt);
  }

  public async bindTopics(): Promise<void> {
    const consumer = this._consumer;
    if (!consumer) {
      throw Error('No consumer initialized');
    }

    const consumerSubscribeOptions = this.options.subscribe || {};

    if (this.responsePatterns.length > 0) {
      await consumer.subscribe({
        ...consumerSubscribeOptions,
        topics: this.responsePatterns,
      });
      // `close()` may have disconnected the consumer while it was subscribing,
      // and a newer attempt may have replaced it.
      if (this._consumer !== consumer) {
        throw new Error('Connection closed');
      }
    }

    await consumer.run({
      ...(this.options.run || {}),
      eachMessage: this.createResponseCallback(),
    });
  }

  public async createClient<T = any>(): Promise<T> {
    const kafkaPackage = await loadPackage(
      'kafkajs',
      ClientKafka.name,
      () => import('kafkajs'),
    );

    const kafkaConfig: KafkaConfig = {
      logCreator: KafkaLogger.bind(null, this.logger),
      ...this.options.client,
      brokers: this.brokers,
      clientId: this.clientId,
    };

    return new kafkaPackage.Kafka(kafkaConfig);
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return async (payload: EachMessagePayload) => {
      let rawMessage: KafkaMessage;
      try {
        rawMessage = this.parser!.parse<KafkaMessage>(
          Object.assign(payload.message, {
            topic: payload.topic,
            partition: payload.partition,
          }),
        );
      } catch (err) {
        // A rejection would make kafkajs redeliver the message forever
        this.logger.error(
          `Message skipped (topic "${payload.topic}", partition ${payload.partition}, offset ${payload.message.offset}): ${err.message}`,
        );
        // The pending request can still be failed through the raw header,
        // instead of waiting for a response that is not coming
        let callback: Function | undefined;
        try {
          callback = this.routingMap.get(
            String(payload.message.headers?.[KafkaHeaders.CORRELATION_ID]),
          );
        } catch {
          // A header too large to decode is not the id of a pending request
        }
        return callback?.({ err, isDisposed: true });
      }
      const correlationId = rawMessage.headers![KafkaHeaders.CORRELATION_ID];
      // kafkajs decodes an empty header value as null
      if (isNil(correlationId)) {
        return;
      }
      let incomingResponse: IncomingResponse;
      try {
        incomingResponse = await this.deserializer.deserialize(rawMessage);
      } catch (error) {
        // The correlation id is on the headers, so the pending request can be
        // failed here instead of staying pending forever.
        const callback = this.routingMap.get(correlationId.toString());
        return callback?.({ err: error, isDisposed: true });
      }
      const { err, response, isDisposed, id } = incomingResponse;
      const callback = this.routingMap.get(id);
      if (!callback) {
        return;
      }
      if (err || isDisposed) {
        return callback({
          err,
          response,
          isDisposed,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  public getConsumerAssignments() {
    return this.consumerAssignments;
  }

  public emitBatch<TResult = any, TInput = any>(
    pattern: any,
    data: { messages: TInput[] },
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(() => new InvalidMessageException());
    }
    const source = defer(async () => this.connect()).pipe(
      mergeMap(() => this.dispatchBatchEvent(this.createPacket(pattern, data))),
    );
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();
    return connectableSource;
  }

  public commitOffsets(
    topicPartitions: TopicPartitionOffsetAndMetadata[],
  ): Promise<void> {
    if (this._consumer) {
      return this._consumer.commitOffsets(topicPartitions);
    } else {
      throw new Error('No consumer initialized');
    }
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.client as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method is not supported for Kafka client');
  }

  protected registerConsumerEventListeners() {
    if (!this._consumer) {
      return;
    }
    this._consumer.on(this._consumer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this._consumer.on(this._consumer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
    this._consumer.on(this._consumer.events.REBALANCING, () =>
      this._status$.next(KafkaStatus.REBALANCING),
    );
    this._consumer.on(this._consumer.events.STOP, () =>
      this._status$.next(KafkaStatus.STOPPED),
    );
    this._consumer.on(this._consumer.events.CRASH, () =>
      this._status$.next(KafkaStatus.CRASHED),
    );
  }

  protected registerProducerEventListeners() {
    if (!this._producer) {
      return;
    }
    this._producer.on(this._producer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    this._producer.on(this._producer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
  }

  protected async dispatchBatchEvent<TInput = any>(
    packets: ReadPacket<{ messages: TInput[] }>,
  ): Promise<any> {
    if (packets.data.messages.length === 0) {
      return;
    }
    const pattern = this.normalizePattern(packets.pattern);
    const outgoingEvents = await Promise.all(
      packets.data.messages.map(message => {
        return this.serializer.serialize(message as any, { pattern });
      }),
    );

    const message = {
      topic: pattern,
      // The batch is a single packet, so its metadata goes on every message
      messages: outgoingEvents.map(outgoingEvent =>
        this.withoutReplyHeaders(
          this.mergeMetadata(outgoingEvent, packets.metadata),
        ),
      ),
      ...(this.options.send || {}),
    };

    return this.producer.send(message);
  }

  protected async dispatchEvent(packet: OutgoingEvent): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const outgoingEvent = this.withoutReplyHeaders(
      this.mergeMetadata(
        await this.serializer.serialize(packet.data, { pattern }),
        packet.metadata,
      ),
    );
    const message = {
      topic: pattern,
      messages: [outgoingEvent],
      ...(this.options.send || {}),
    };

    return this._producer!.send(message);
  }

  protected getReplyTopicPartition(topic: string): string {
    const minimumPartition = this.consumerAssignments[topic];
    if (isUndefined(minimumPartition)) {
      throw new InvalidKafkaClientTopicException(topic);
    }

    // Get the minimum partition
    return minimumPartition.toString();
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    const packet = this.assignPacketId(partialPacket);
    this.routingMap.set(packet.id, callback);

    const cleanup = () => this.routingMap.delete(packet.id);
    const errorCallback = (err: unknown) => {
      cleanup();
      callback({ err });
    };

    try {
      const pattern = this.normalizePattern(partialPacket.pattern);
      const replyTopic = this.getResponsePatternName(pattern);
      const replyPartition = this.getReplyTopicPartition(replyTopic);

      Promise.resolve(this.serializer.serialize(packet.data, { pattern }))
        .then((serializedRequest: KafkaRequest) => {
          // Ahead of the reply headers, which no metadata entry may replace
          const serializedPacket = this.mergeMetadata(
            serializedRequest,
            packet.metadata,
          );
          serializedPacket.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
          serializedPacket.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
          serializedPacket.headers[KafkaHeaders.REPLY_PARTITION] =
            replyPartition;

          const message = {
            topic: pattern,
            messages: [serializedPacket],
            ...(this.options.send || {}),
          };

          return this._producer!.send(message);
        })
        .catch(err => errorCallback(err));

      return cleanup;
    } catch (err) {
      errorCallback(err);
      return () => null;
    }
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  /**
   * Adds the metadata a dispatch hook attached to a packet to the headers of
   * a serialized message, under every name the message does not set itself.
   * Returns a copy, as the message may be the caller's own record.
   */
  protected mergeMetadata<T extends { headers?: Record<string, any> }>(
    message: T,
    metadata: PacketMetadata | undefined,
  ): T {
    if (!hasPacketMetadata(metadata)) {
      return message;
    }
    return { ...message, headers: { ...metadata, ...message.headers } };
  }

  /**
   * Returns a copy of an event's message without the headers that make
   * ServerKafka take a message with a correlation id for a request, and
   * publish its response to the topic they name. The headers of an event can
   * come from the data it forwards (an object with a "value" is sent as the
   * message it describes), so they cannot ask for a reply.
   */
  protected withoutReplyHeaders<T extends { headers?: Record<string, any> }>(
    message: T,
  ): T {
    if (!message?.headers) {
      return message;
    }
    const headers = { ...message.headers };
    delete headers[KafkaHeaders.REPLY_TOPIC];
    delete headers[KafkaHeaders.REPLY_PARTITION];
    return { ...message, headers };
  }

  protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
    const consumerAssignments: { [key: string]: number } = {};

    // Only need to set the minimum
    for (const [topic, memberPartitions] of Object.entries(
      data.payload.memberAssignment,
    )) {
      if (memberPartitions.length) {
        consumerAssignments[topic] = Math.min(...memberPartitions);
      }
    }

    this.consumerAssignments = consumerAssignments;
  }

  protected initializeSerializer(options: KafkaOptions['options']) {
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
  }

  protected initializeDeserializer(options: KafkaOptions['options']) {
    this.deserializer =
      (options && options.deserializer) || new KafkaResponseDeserializer();
  }
}
