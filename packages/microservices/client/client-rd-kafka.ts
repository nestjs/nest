import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
} from '../constants';
import { KafkaResponseDeserializer } from '../deserializers/kafka-response.deserializer';
import { KafkaHeaders } from '../enums';
import { InvalidKafkaClientTopicException } from '../errors/invalid-kafka-client-topic.exception';
import {
  KafkaLogger,
  KafkaParser,
  KafkaReplyPartitionAssigner,
} from '../helpers';
import {
  OutgoingEvent,
  RdKafkaOptions,
  ReadPacket,
  WritePacket,
} from '../interfaces';

import { ClientProxy } from './client-proxy';
import {
  Client,
  ConsumerGlobalConfig,
  GlobalConfig,
  HighLevelProducer,
  KafkaConsumer,
  Message,
} from '../external/rd-kafka.interface';
import {
  RdKafkaRequest,
  RdKafkaRequestSerializer,
} from '../serializers/rd-kafka-request.serializer';

let kafkaPackage: any = {};

/**
 * @publicApi
 */
export class ClientRdKafka extends ClientProxy {
  protected logger = new Logger(ClientRdKafka.name);
  protected consumer: KafkaConsumer | null = null;
  protected producer: HighLevelProducer | null = null;
  protected parser: KafkaParser | null = null;
  protected initialized: Promise<void> | null = null;
  protected responsePatterns: string[] = [];
  protected consumerAssignments: { [key: string]: number } = {};
  protected brokers: string;
  protected clientId: string;
  protected groupId: string;
  protected producerOnlyMode: boolean;

  constructor(protected readonly options: RdKafkaOptions['options']) {
    super();

    const clientOptions = this.getOptionsProp(
      this.options,
      'client',
      {} as GlobalConfig,
    );
    const consumerOptions = this.getOptionsProp(
      this.options,
      'consumer',
      {} as ConsumerGlobalConfig,
    );

    this.brokers =
      clientOptions['metadata.broker.list'] || KAFKA_DEFAULT_BROKER;

    this.producerOnlyMode = this.getOptionsProp(
      this.options,
      'producerOnlyMode',
      false,
    );

    const postfixId = this.getOptionsProp(this.options, 'postfixId', '-client');
    // Append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    (clientOptions['client.id'] || KAFKA_DEFAULT_CLIENT) + postfixId;

    this.groupId =
      (consumerOptions['group.id'] || KAFKA_DEFAULT_GROUP) + postfixId;

    kafkaPackage = loadPackage(
      '@confluentinc/kafka-javascript',
      ClientRdKafka.name,
      () => require('@confluentinc/kafka-javascript'),
    );

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public subscribeToResponseOf(pattern: any): void {
    const request = this.normalizePattern(pattern);
    this.responsePatterns.push(this.getResponsePatternName(request));
  }

  public async close(): Promise<void> {
    this.consumer && (await this.disconnectClient(this.consumer));
    this.producer && (await this.disconnectClient(this.producer));
    this.producer = null;
    this.consumer = null;
    this.initialized = null;
  }

  public async disconnectClient(client: Client<any>): Promise<void> {
    // wrapping with a promise to avoid creating event handlers manually for the disconnect
    return new Promise((resolve, reject) => {
      return client.disconnect(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async connect(): Promise<HighLevelProducer> {
    if (this.initialized) {
      return this.initialized.then(() => this.producer);
    }
    this.initialized = new Promise(async (resolve, reject) => {
      try {
        // TODO: we're going to have to write our own partition assigner for rdkafka
        // if (!this.producerOnlyMode) {
        //   // TODO: we're going to have to write our own assigner for rdkafka
        //   const partitionAssigners = [];
        //   // const partitionAssigners = [
        //   //   (
        //   //     config: ConstructorParameters<
        //   //       typeof KafkaReplyPartitionAssigner
        //   //     >[1],
        //   //   ) => new KafkaReplyPartitionAssigner(this, config),
        //   // ];

        //   const consumerOptions = Object.assign(
        //     {
        //       partitionAssigners,
        //     },
        //     this.options.consumer || {},
        //     {
        //       groupId: this.groupId,
        //     },
        //   );

        //   this.consumer = this.client.consumer(consumerOptions);
        //   // set member assignments on join and rebalance
        //   this.consumer.on(
        //     this.consumer.events.GROUP_JOIN,
        //     this.setConsumerAssignments.bind(this),
        //   );
        //   await this.consumer.connect();
        //   await this.bindTopics();
        // }

        const producerOptions = Object.assign(
          {},
          this.options.client || {},
          this.options.producer || {},
          {
            'client.id': this.clientId,
            'metadata.broker.list': this.brokers,
          },
        );
        this.producer = new kafkaPackage.HighLevelProducer(producerOptions);

        // TODO: remove the following debug messages later
        // logging debug messages, if debug is enabled
        this.producer.on('event.log', log => {
          console.log(log);
        });

        //logging all errors
        this.producer.on('event.error', err => {
          console.error('Error from producer');
          console.error(err);
        });

        this.producer.on('delivery-report', (err, report) => {
          console.log('delivery-report: ', report);
        });

        await this.connectClient(this.producer);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
    return this.initialized.then(() => this.producer);
  }

  public async connectClient(client: Client<any>): Promise<void> {
    // wrapping with a promise to avoid creating event handlers manually for the connect
    return new Promise((resolve, reject) => {
      return client.connect(
        {
          // TODO: make this more efficient by only getting metadata for the topics we care about
          allTopics: true,
        },
        err => {
          if (err) {
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  // public async bindTopics(): Promise<void> {
  //   if (!this.consumer) {
  //     throw Error('No consumer initialized');
  //   }

  //   const consumerSubscribeOptions = this.options.subscribe || {};

  //   if (this.responsePatterns.length > 0) {
  //     await this.consumer.subscribe({
  //       ...consumerSubscribeOptions,
  //       topics: this.responsePatterns,
  //     });
  //   }

  //   await this.consumer.run(
  //     Object.assign(this.options.run || {}, {
  //       eachMessage: this.createResponseCallback(),
  //     }),
  //   );
  // }

  public createResponseCallback(): (message: Message) => any {
    return async (message: Message) => {
      const rawMessage = this.parser.parse<Message>(message);
      if (isUndefined(rawMessage.headers[KafkaHeaders.CORRELATION_ID])) {
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

  protected async dispatchEvent(packet: OutgoingEvent): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const outgoingEvent = await this.serializer.serialize(packet.data, {
      pattern,
    });

    return new Promise((resolve, reject) => {
      // TODO: fix the headers
      // this.producer.produce(pattern, null, outgoingEvent.value, outgoingEvent.key, null, outgoingEvent.headers, (err, offset) => { // this does not work either
      // this.producer.produce(pattern, -1, outgoingEvent.value, outgoingEvent.key, null, null, (err, offset) => { // this does not work
      // for some reason this following works? probably need to pass only buffers
      this.producer.produce(
        pattern,
        -1,
        Buffer.from(outgoingEvent.value),
        outgoingEvent.key || null,
        null,
        (err, offset) => {
          if (err) {
            return reject(err);
          }
          return resolve(offset);
        },
      );
    });
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
        .then((serializedPacket: RdKafkaRequest) => {
          const headers = [];
          headers.push({
            [KafkaHeaders.CORRELATION_ID]: packet.id,
          });
          headers.push({
            [KafkaHeaders.REPLY_TOPIC]: replyTopic,
          });
          headers.push({
            [KafkaHeaders.REPLY_PARTITION]: replyPartition,
          });
          // TODO: maybe the following is actually right
          // headers[KafkaHeaders.CORRELATION_ID] = packet.id;
          // headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
          // headers[KafkaHeaders.REPLY_PARTITION] = replyPartition;

          // TODO: fix the serialized packet type either in the confluent lib or nestjs so user can pass their own headers

          return new Promise((resolve, reject) => {
            this.producer.produce(
              pattern,
              null,
              serializedPacket.value,
              serializedPacket.key,
              null,
              headers,
              (err, offset) => {
                if (err) {
                  return reject(err);
                }
                return resolve(offset);
              },
            );
          });
        })
        .catch(err => errorCallback(err));

      return cleanup;
    } catch (err) {
      errorCallback(err);
    }
  }

  protected getResponsePatternName(pattern: string): string {
    return `${pattern}.reply`;
  }

  // protected setConsumerAssignments(data: ConsumerGroupJoinEvent): void {
  //   const consumerAssignments: { [key: string]: number } = {};

  //   // only need to set the minimum
  //   Object.keys(data.payload.memberAssignment).forEach(topic => {
  //     const memberPartitions = data.payload.memberAssignment[topic];

  //     if (memberPartitions.length) {
  //       consumerAssignments[topic] = Math.min(...memberPartitions);
  //     }
  //   });

  //   this.consumerAssignments = consumerAssignments;
  // }

  protected initializeSerializer(options: RdKafkaOptions['options']) {
    this.serializer =
      (options && options.serializer) || new RdKafkaRequestSerializer();
  }

  protected initializeDeserializer(options: RdKafkaOptions['options']) {
    this.deserializer =
      (options && options.deserializer) || new KafkaResponseDeserializer();
  }

  // public commitOffsets(
  //   topicPartitions: TopicPartitionOffsetAndMetadata[],
  // ): Promise<void> {
  //   if (this.consumer) {
  //     return this.consumer.commitOffsets(topicPartitions);
  //   } else {
  //     throw new Error('No consumer initialized');
  //   }
  // }
}
