import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';

import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP
} from '../constants';
import { ReadPacket, KafkaOptions, WritePacket, PacketId } from '../interfaces';
import { ClientProxy } from './client-proxy';

import { KafkaSerializer, KafkaRoundRobinByTimePartitionAssigner, KafkaLogger } from '../helpers';

import {
  KafkaConfig,
  ConsumerConfig,
  Kafka,
  Producer,
  Consumer,
  EachMessagePayload,
  Message,
  KafkaMessage,
  ConsumerGroupJoinEvent
} from '../external/kafka.interface';
import { KafkaHeaders } from '../enums';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception';
import { InvalidKafkaClientTopicPartitionException } from '../errors/invalid-kafka-client-topic-partition.exception';

let kafkaPackage: any = {};

export class ClientKafka extends ClientProxy {
  protected readonly logger = new Logger(ClientKafka.name);
  public client: Kafka = null;
  public consumer: Consumer = null;
  public producer: Producer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  protected consumerAssignments: {[key: string]: number[]} = {};
  protected responsePatterns: string[] = [];

  constructor(protected readonly options: KafkaOptions['options']) {
    super();

    // get client and consumer options
    const clientOptions = this.getOptionsProp(this.options, 'client') || {} as KafkaConfig;
    const consumerOptions = this.getOptionsProp(this.options, 'consumer') || {} as ConsumerConfig;

    // set options
    this.brokers = (clientOptions.brokers || [KAFKA_DEFAULT_BROKER]);

    // append a unique id to the clientId and groupId so they don't collide with a microservices client
    this.clientId = (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + '-client';
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + '-client';

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () => require('kafkajs'));
  }

  public subscribeToResponseOf(pattern: any): void {
    const request = this.normalizePattern(pattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  public close(): void {
    this.producer && this.producer.disconnect();
    this.consumer && this.consumer.disconnect();
    this.producer = null;
    this.consumer = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.client) {
      return this.producer;
    }
    this.client = this.createClient();

    this.producer = this.client.producer(this.options.producer || {});
    this.consumer = this.client.consumer(Object.assign({
      partitionAssigners: [
        KafkaRoundRobinByTimePartitionAssigner
      ]
    }, this.options.consumer || {}, {
      groupId: this.groupId
    }));

    // set member assignments on join and rebalance
    this.consumer.on(this.consumer.events.GROUP_JOIN, this.setConsumerAssignments.bind(this));

    // connect the producer and consumer
    await this.producer.connect();
    await this.consumer.connect();

    // bind the topics
    await this.bindTopics();

    return this.producer;
  }

  protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
    this.consumerAssignments = data.payload.memberAssignment;
  }

  public async bindTopics(): Promise<void> {
    await Promise.all(this.responsePatterns.map(async responsePattern => {
      // subscribe to the pattern of the topic
      await this.consumer.subscribe({
        topic: responsePattern
      });
    }));

    // run the consumer to start listening on the reply topics
    await this.consumer.run(Object.assign(this.options.run || {}, {
      eachMessage: this.createResponseCallback()
    }));
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.Kafka(Object.assign(this.options.client || {}, {
      clientId: this.clientId,
      brokers: this.brokers,
      logCreator: KafkaLogger.bind(null, this.logger),
    }) as KafkaConfig);
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return (payload: EachMessagePayload) => {
      // create response from a deserialized payload
      const message = KafkaSerializer.deserialize<KafkaMessage>(Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition
      }));

      // construct packet
      const packet = {
        id: undefined,
        pattern: payload.topic,
        response: message
      };

      // parse the correlation id
      if (isUndefined(packet.response.headers[KafkaHeaders.CORRELATION_ID])) {
        return;
      }

      // parse and assign the correlation id as the packet id
      packet.id = packet.response.headers[KafkaHeaders.CORRELATION_ID].toString();

      // find the callback
      const callback = this.routingMap.get(packet.id);
      if (!callback) {
        return;
      }

      // declare nestjs vars
      let err: string = null;
      let isDisposed: boolean;

      // parse the nestjs headers
      if (!isUndefined(packet.response.headers[KafkaHeaders.NESTJS_ERR])) {
        err = packet.response.headers[KafkaHeaders.NESTJS_ERR].toString();
        isDisposed = true;
      }

      if (!isUndefined(packet.response.headers[KafkaHeaders.NESTJS_IS_DISPOSED])) {
        isDisposed = true;
      }

      // invoke the callback
      if (err || isDisposed) {
        return callback({
          err,
          response: null,
          isDisposed
        });
      }

      callback({
        err,
        response: packet.response
      });
    };
  }

  protected dispatchEvent(packet: ReadPacket & PacketId): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);

    // serialize for sanity
    packet.data = KafkaSerializer.serialize<Message>(packet.data);

    // send
    return this.producer.send(Object.assign({
      topic: pattern,
      messages: [packet.data]
    }, this.options.send || {}));
  }

  protected getReplyTopicPartition(topic: string): string {
    // get topic assignment
    const topicAssignments = this.consumerAssignments[topic];

    // throw error
    if (isUndefined(topicAssignments)) {
      throw new InvalidKafkaClientTopicException(topic);
    }

    // if the current member isn't listening to any partitions on the topic then throw an error.
    if (isUndefined(topicAssignments[0])) {
      throw new InvalidKafkaClientTopicPartitionException(topic);
    }

    return topicAssignments[0].toString();
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      // create packet
      const packet = this.assignPacketId(partialPacket);
      packet.data = KafkaSerializer.serialize<Message>(packet.data);

      // get the response meta
      const pattern = this.normalizePattern(partialPacket.pattern);
      const replyTopic = this.getResponsePatternName(pattern);
      const replyPartition = this.getReplyTopicPartition(replyTopic);

      // set the route
      this.routingMap.set(packet.id, callback);

      // correlate
      packet.data.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
      packet.data.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
      packet.data.headers[KafkaHeaders.REPLY_PARTITION] = replyPartition;

      // send through unhandled promise
      this.producer.send(Object.assign({
        topic: pattern,
        messages: [packet.data]
      }, this.options.send || {}));

      // send
      return () => {
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
    }
  }
}
