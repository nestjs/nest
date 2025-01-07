import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
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
} from '../constants';
import { KafkaResponseDeserializer } from '../deserializers/kafka-response.deserializer';
import { KafkaHeaders } from '../enums';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception';
import { InvalidMessageException } from '../errors/invalid-message.exception';
import { KafkaStatus } from '../events';
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
} from '../external/kafka.interface';
import {
  KafkaLogger,
  KafkaParser,
  KafkaReplyPartitionAssigner,
} from '../helpers';
import {
  ClientKafkaProxy,
  KafkaOptions,
  MsPattern,
  OutgoingEvent,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import {
  KafkaRequest,
  KafkaRequestSerializer,
} from '../serializers/kafka-request.serializer';
import { ClientProxy } from './client-proxy';

let kafkaPackage: any = {};

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

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () =>
      require('kafkajs'),
    );

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public subscribeToResponseOf(pattern: unknown): void {
    const request = this.normalizePattern(pattern as MsPattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this._producer && (await this._producer.disconnect());
    this._consumer && (await this._consumer.disconnect());
    this._producer = null;
    this._consumer = null;
    this.initialized = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.initialized) {
      return this.initialized.then(() => this._producer!);
    }
    /* eslint-disable-next-line no-async-promise-executor */
    this.initialized = new Promise(async (resolve, reject) => {
      try {
        this.client = this.createClient();
        if (!this.producerOnlyMode) {
          const partitionAssigners = [
            (
              config: ConstructorParameters<
                typeof KafkaReplyPartitionAssigner
              >[1],
            ) => new KafkaReplyPartitionAssigner(this, config),
          ];

          const consumerOptions = Object.assign(
            {
              partitionAssigners,
            },
            this.options.consumer || {},
            {
              groupId: this.groupId,
            },
          );

          this._consumer = this.client!.consumer(consumerOptions);
          this.registerConsumerEventListeners();

          // Set member assignments on join and rebalance
          this._consumer.on(
            this._consumer.events.GROUP_JOIN,
            this.setConsumerAssignments.bind(this),
          );
          await this._consumer.connect();
          await this.bindTopics();
        }

        this._producer = this.client!.producer(this.options.producer || {});
        this.registerProducerEventListeners();
        await this._producer.connect();

        resolve();
      } catch (err) {
        reject(err);
      }
    });
    return this.initialized.then(() => this._producer!);
  }

  public async bindTopics(): Promise<void> {
    if (!this._consumer) {
      throw Error('No consumer initialized');
    }

    const consumerSubscribeOptions = this.options.subscribe || {};

    if (this.responsePatterns.length > 0) {
      await this._consumer.subscribe({
        ...consumerSubscribeOptions,
        topics: this.responsePatterns,
      });
    }

    await this._consumer.run(
      Object.assign(this.options.run || {}, {
        eachMessage: this.createResponseCallback(),
      }),
    );
  }

  public createClient<T = any>(): T {
    const kafkaConfig: KafkaConfig = Object.assign(
      { logCreator: KafkaLogger.bind(null, this.logger) },
      this.options.client,
      { brokers: this.brokers, clientId: this.clientId },
    );

    return new kafkaPackage.Kafka(kafkaConfig);
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return async (payload: EachMessagePayload) => {
      const rawMessage = this.parser!.parse<KafkaMessage>(
        Object.assign(payload.message, {
          topic: payload.topic,
          partition: payload.partition,
        }),
      );
      if (isUndefined(rawMessage.headers![KafkaHeaders.CORRELATION_ID])) {
        return;
      }
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(rawMessage);
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
      mergeMap(() => this.dispatchBatchEvent({ pattern, data })),
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
    this.consumer.on(this._consumer.events.CRASH, () =>
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

    const message = Object.assign(
      {
        topic: pattern,
        messages: outgoingEvents,
      },
      this.options.send || {},
    );

    return this.producer.send(message);
  }

  protected async dispatchEvent(packet: OutgoingEvent): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const outgoingEvent = await this.serializer.serialize(packet.data, {
      pattern,
    });
    const message = Object.assign(
      {
        topic: pattern,
        messages: [outgoingEvent],
      },
      this.options.send || {},
    );

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
        .then((serializedPacket: KafkaRequest) => {
          serializedPacket.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
          serializedPacket.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
          serializedPacket.headers[KafkaHeaders.REPLY_PARTITION] =
            replyPartition;

          const message = Object.assign(
            {
              topic: pattern,
              messages: [serializedPacket],
            },
            this.options.send || {},
          );

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

  protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
    const consumerAssignments: { [key: string]: number } = {};

    // Only need to set the minimum
    Object.keys(data.payload.memberAssignment).forEach(topic => {
      const memberPartitions = data.payload.memberAssignment[topic];

      if (memberPartitions.length) {
        consumerAssignments[topic] = Math.min(...memberPartitions);
      }
    });

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
