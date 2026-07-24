import { Logger } from '@nestjs/common/services/logger.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { isObservable, lastValueFrom, Observable, ReplaySubject } from 'rxjs';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { KafkaContext } from '../ctx-host';
import { KafkaRequestDeserializer } from '../deserializers/kafka-request.deserializer';
import { KafkaHeaders, Transport } from '../enums';
import { KafkaStatus } from '../events';
import { KafkaRetriableException } from '../exceptions';
import {
  BrokersFunction,
  Consumer,
  ConsumerConfig,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  KafkaMessage,
  Message,
  Producer,
  RecordMetadata,
} from '../external/kafka.interface';
import { KafkaLogger, KafkaParser } from '../helpers';
import {
  KafkaOptions,
  OutgoingResponse,
  ReadPacket,
  TransportId,
} from '../interfaces';
import { KafkaRequestSerializer } from '../serializers/kafka-request.serializer';
import { Server } from './server';

/**
 * @publicApi
 */
export class ServerKafka extends Server<never, KafkaStatus> {
  public transportId: TransportId = Transport.KAFKA;

  protected logger = new Logger(ServerKafka.name);
  protected client: Kafka | null = null;
  protected consumer: Consumer | null = null;
  protected consumers: Map<string, Consumer> = new Map();
  protected producer: Producer | null = null;
  protected parser: KafkaParser | null = null;
  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;

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
    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-server');

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
    if (this.consumers.size > 0) {
      await Promise.allSettled(
        [...this.consumers.values()].map(consumer => consumer.disconnect()),
      );
      this.consumers.clear();
    }
    this.consumer && (await this.consumer.disconnect());
    this.producer && (await this.producer.disconnect());
    this.consumer = null;
    this.producer = null;
    this.client = null;
  }

  public async start(callback: () => void): Promise<void> {
    const consumerOptions = Object.assign({}, this.options.consumer || {}, {
      groupId: this.groupId,
    });

    if (this.getOptionsProp(this.options, 'topicConsumers', false)) {
      this.producer = this.client!.producer(this.options.producer);
      this.registerProducerEventListeners();
      await this.producer.connect();
      await this.bindEventsPerTopic(consumerOptions);
    } else {
      this.consumer = this.client!.consumer(consumerOptions);
      this.producer = this.client!.producer(this.options.producer);
      this.registerConsumerEventListeners();
      this.registerProducerEventListeners();
      await this.consumer.connect();
      await this.producer.connect();
      await this.bindEvents(this.consumer);
    }
    callback();
  }

  protected registerConsumerEventListeners() {
    if (!this.consumer) {
      return;
    }
    this.registerConsumerEventListenersFor(this.consumer);
  }

  protected registerConsumerEventListenersFor(consumer: Consumer) {
    consumer.on(consumer.events.CONNECT, () =>
      this._status$.next(KafkaStatus.CONNECTED),
    );
    consumer.on(consumer.events.DISCONNECT, () =>
      this._status$.next(KafkaStatus.DISCONNECTED),
    );
    consumer.on(consumer.events.REBALANCING, () =>
      this._status$.next(KafkaStatus.REBALANCING),
    );
    consumer.on(consumer.events.STOP, () =>
      this._status$.next(KafkaStatus.STOPPED),
    );
    consumer.on(consumer.events.CRASH, () =>
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
    const kafkaPackage = await this.loadPackage(
      'kafkajs',
      ServerKafka.name,
      () => import('kafkajs'),
    );
    return new kafkaPackage.Kafka(
      Object.assign(
        { logCreator: KafkaLogger.bind(null, this.logger) },
        this.options.client,
        { clientId: this.clientId, brokers: this.brokers },
      ) as KafkaConfig,
    ) as T;
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};

    if (registeredPatterns.length > 0) {
      await consumer.subscribe({
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

  public async bindEventsPerTopic(consumerOptions: ConsumerConfig) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    const consumerSubscribeOptions = this.options.subscribe || {};

    try {
      for (const topic of registeredPatterns) {
        const composedGroupId = `${this.groupId}-${topic}`;
        if (!/^[a-zA-Z0-9._-]{1,255}$/.test(composedGroupId)) {
          this.logger.warn(
            `Consumer group ID "${composedGroupId}" may be invalid: ` +
              `must be 1–255 characters and contain only alphanumeric, '.', '_', or '-'.`,
          );
        }
        const topicConsumer = this.client!.consumer({
          ...consumerOptions,
          groupId: composedGroupId,
        });
        this.registerConsumerEventListenersFor(topicConsumer);
        await topicConsumer.connect();
        this.consumers.set(topic, topicConsumer);
        await topicConsumer.subscribe({
          ...consumerSubscribeOptions,
          topics: [topic],
        });
        const consumerRunOptions = {
          ...(this.options.run || {}),
          eachMessage: this.getMessageHandler(),
        };
        await topicConsumer.run(consumerRunOptions);
      }
    } catch (err) {
      await Promise.allSettled(
        [...this.consumers.values()].map(consumer => consumer.disconnect()),
      );
      this.consumers.clear();
      throw err;
    }
  }

  public getMessageHandler() {
    return async (payload: EachMessagePayload) => this.handleMessage(payload);
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

  public async handleMessage(payload: EachMessagePayload) {
    const channel = payload.topic;
    const rawMessage = this.parser!.parse<KafkaMessage>(
      Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition,
      }),
    );
    const headers = rawMessage.headers as unknown as Record<string, any>;
    const correlationId = headers[KafkaHeaders.CORRELATION_ID];
    const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
    const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];

    const packet = await this.deserializer.deserialize(rawMessage, { channel });
    const consumer = this.consumers.get(payload.topic) ?? this.consumer!;
    const kafkaContext = new KafkaContext([
      rawMessage,
      payload.partition,
      payload.topic,
      consumer,
      payload.heartbeat,
      this.producer!,
    ]);
    const handler = this.getHandlerByPattern(packet.pattern);
    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (handler?.isEventHandler || !correlationId || !replyTopic) {
      return this.handleEvent(packet.pattern, packet, kafkaContext);
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
    return this.onProcessingStartHook(
      this.transportId,
      kafkaContext,
      async () => {
        const response$ = this.transformToObservable(
          handler(packet.data, kafkaContext),
        );

        const replayStream$ = new ReplaySubject();
        await this.combineStreamsAndThrowIfRetriable(response$, replayStream$);

        this.send(replayStream$, publish);
      },
    );
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    if (this.consumers.size > 0) {
      return [this.client, this.consumers, this.producer] as T;
    }
    return [this.client, this.consumer, this.producer] as T;
  }

  public on<
    EventKey extends string | number | symbol = string | number | symbol,
    EventCallback = any,
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method is not supported for Kafka server');
  }

  private combineStreamsAndThrowIfRetriable(
    response$: Observable<any>,
    replayStream$: ReplaySubject<unknown>,
  ) {
    return new Promise<void>((resolve, reject) => {
      let isPromiseResolved = false;
      response$.subscribe({
        next: val => {
          replayStream$.next(val);
          if (!isPromiseResolved) {
            isPromiseResolved = true;
            resolve();
          }
        },
        error: err => {
          if (err instanceof KafkaRetriableException && !isPromiseResolved) {
            isPromiseResolved = true;
            reject(err);
          } else {
            resolve();
          }
          replayStream$.error(err);
        },
        complete: () => replayStream$.complete(),
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
    this.assignReplyPartition(replyPartition, outgoingMessage);
    this.assignCorrelationIdHeader(correlationId, outgoingMessage);
    this.assignErrorHeader(message, outgoingMessage);
    this.assignIsDisposedHeader(message, outgoingMessage);

    const replyMessage = Object.assign(
      {
        topic: replyTopic,
        messages: [outgoingMessage],
      },
      this.options.send || {},
    );
    return this.producer!.send(replyMessage).finally(() => {
      this.onProcessingEndHook?.(this.transportId, context);
    });
  }

  public assignIsDisposedHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
    if (!outgoingResponse.isDisposed) {
      return;
    }
    outgoingMessage.headers![KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
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

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: KafkaContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }

    return this.onProcessingStartHook(this.transportId, context, async () => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        await lastValueFrom(resultOrStream);
        this.onProcessingEndHook?.(this.transportId, context);
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
