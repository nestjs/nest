import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { defer, Observable, Observer, throwError as _throw } from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';
import { isNil } from '../../common/utils/shared.utils';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants';
import { KafkaResponseDeserializer } from '../deserializers/kafka-response.deserializer';
import { KafkaHeaders } from '../enums';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception';
import { InvalidMessageException } from '../errors/invalid-message.exception';
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
} from '../external/kafka.interface';
import {
  KafkaLogger,
  KafkaParser,
  KafkaReplyPartitionAssigner,
} from '../helpers';
import {
  KafkaOptions,
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
const INT64_SIZE = 8;
const INT32_SIZE = 4;

export class ClientKafka extends ClientProxy {
  protected client: Kafka = null;
  protected consumer: Consumer = null;
  protected producer: Producer = null;
  protected logger = new Logger(ClientKafka.name);
  protected responsePatterns: string[] = [];
  protected consumerAssignments: { [key: string]: number } = {};

  protected brokers: string[] | BrokersFunction;
  protected clientId: string;
  protected groupId: string;

  constructor(protected readonly options: KafkaOptions['options']) {
    super();

    const clientOptions =
      this.getOptionsProp(this.options, 'client') || ({} as KafkaConfig);
    const consumerOptions =
      this.getOptionsProp(this.options, 'consumer') || ({} as ConsumerConfig);
    const postfixId =
      this.getOptionsProp(this.options, 'postfixId') || '-client';

    this.brokers = clientOptions.brokers || [KAFKA_DEFAULT_BROKER];

    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + postfixId;
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + postfixId;

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () =>
      require('kafkajs'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public subscribeToResponseOf(pattern: any): void {
    const request = this.normalizePattern(pattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this.producer && (await this.producer.disconnect());
    this.consumer && (await this.consumer.disconnect());
    this.producer = null;
    this.consumer = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.client) {
      return this.producer;
    }
    this.client = this.createClient();

    const partitionAssigners = [
      (config: ConstructorParameters<typeof KafkaReplyPartitionAssigner>[1]) =>
        new KafkaReplyPartitionAssigner(this, config),
    ] as any[];

    const consumerOptions = Object.assign(
      {
        partitionAssigners,
      },
      this.options.consumer || {},
      {
        groupId: this.groupId,
      },
    );
    this.producer = this.client.producer(this.options.producer || {});
    this.consumer = this.client.consumer(consumerOptions);

    // set member assignments on join and rebalance
    this.consumer.on(
      this.consumer.events.GROUP_JOIN,
      this.setConsumerAssignments.bind(this),
    );

    await this.producer.connect();
    await this.consumer.connect();
    await this.bindTopics();
    return this.producer;
  }

  public async bindTopics(): Promise<void> {
    const consumerSubscribeOptions = this.options.subscribe || {};
    const subscribeTo = async (responsePattern: string) =>
      this.consumer.subscribe({
        topic: responsePattern,
        ...consumerSubscribeOptions,
      });
    await Promise.all(this.responsePatterns.map(subscribeTo));

    await this.consumer.run(
      Object.assign(this.options.run || {}, {
        eachMessage: this.createResponseCallback(),
      }),
    );
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.Kafka(
      Object.assign(this.options.client || {}, {
        clientId: this.clientId,
        brokers: this.brokers,
        logCreator: KafkaLogger.bind(null, this.logger),
      }) as KafkaConfig,
    );
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return (payload: EachMessagePayload) => {
      const rawMessage = KafkaParser.parse<KafkaMessage>(
        Object.assign(payload.message, {
          topic: payload.topic,
          partition: payload.partition,
        }),
      );
      if (isUndefined(rawMessage.headers[KafkaHeaders.CORRELATION_ID])) {
        return;
      }
      const { err, response, isDisposed, id } = this.deserializer.deserialize(
        rawMessage,
      );
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

  public sendToMultiple<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }

    return defer(async () => {
      await this.connect();
      return await this.membersCountForTopic(pattern);
    }).pipe(
      mergeMap((value: number) =>
        new Observable((observer: Observer<TResult>) => {
          const callback = this.createObserverForMultipleProducers(observer);
          return this.publish({ pattern, data }, callback);
        }).pipe(take(value)),
      ),
    );
  }

  protected async membersCountForTopic(pattern: any): Promise<number> {
    return (
      await this.client
        .admin()
        .describeGroups(
          (await this.client.admin().listGroups()).groups.map(g => g.groupId),
        )
    ).groups
      .map(g =>
        g.members.map(m =>
          m.memberAssignment
            .slice(INT64_SIZE, m.memberAssignment.length - INT32_SIZE * 3)
            .toString('utf-8'),
        ),
      )
      .filter(g => g.find(m => m === pattern)).length;
  }

  protected createObserverForMultipleProducers<T>(
    observer: Observer<T>,
  ): (packet: WritePacket) => void {
    return ({ err, response }: WritePacket) => {
      if (err) {
        return observer.error(this.serializeError(err));
      }
      observer.next(this.serializeResponse(response));
    };
  }

  protected dispatchEvent(packet: OutgoingEvent): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const outgoingEvent = this.serializer.serialize(packet.data);
    const message = Object.assign(
      {
        topic: pattern,
        messages: [outgoingEvent],
      },
      this.options.send || {},
    );
    return this.producer.send(message);
  }

  protected getReplyTopicPartition(topic: string): string {
    const minimumPartition = this.consumerAssignments[topic];
    if (isUndefined(minimumPartition)) {
      throw new InvalidKafkaClientTopicException(topic);
    }

    // get the minimum partition
    return minimumPartition.toString();
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const replyTopic = this.getResponsePatternName(pattern);
      const replyPartition = this.getReplyTopicPartition(replyTopic);

      const serializedPacket: KafkaRequest = this.serializer.serialize(
        packet.data,
      );
      serializedPacket.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
      serializedPacket.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
      serializedPacket.headers[KafkaHeaders.REPLY_PARTITION] = replyPartition;

      this.routingMap.set(packet.id, callback);

      const message = Object.assign(
        {
          topic: pattern,
          messages: [serializedPacket],
        },
        this.options.send || {},
      );
      this.producer.send(message).catch(err => callback({ err }));

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
    const consumerAssignments: { [key: string]: number } = {};

    // only need to set the minimum
    Object.keys(data.payload.memberAssignment).forEach(memberId => {
      const minimumPartition = Math.min(
        ...data.payload.memberAssignment[memberId],
      );

      consumerAssignments[memberId] = minimumPartition;
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
