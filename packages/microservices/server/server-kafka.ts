import { isUndefined, isNil } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_MESSAGE_HANDLER
} from '../constants';
import {
  KafkaConfig,
  ConsumerConfig,
  Kafka,
  Consumer,
  Producer,
  EachMessagePayload,
  KafkaMessage,
  Message,
  logLevel
} from '../external/kafka.interface';
import { CustomTransportStrategy, KafkaOptions, ReadPacket, PacketId, WritePacket } from '../interfaces';
import { KafkaHeaders } from '../enums';
import { Server } from './server';

import { KafkaSerializer, KafkaLogger } from '../helpers';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(ServerKafka.name);
  public client: Kafka = null;
  public consumer: Consumer = null;
  public producer: Producer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  constructor(private readonly options: KafkaOptions['options']) {
    super();

    // get client and consumer options
    const clientOptions = this.getOptionsProp(this.options, 'client') || {} as KafkaConfig;
    const consumerOptions = this.getOptionsProp(this.options, 'consumer') || {} as ConsumerConfig;

    // set options
    this.brokers = (clientOptions.brokers || [KAFKA_DEFAULT_BROKER]);

    // append a unique id to the clientId and groupId so they don't collide with a microservices client
    this.clientId = (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + '-server';
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + '-server';

    kafkaPackage = this.loadPackage('kafkajs', ServerKafka.name, () => require('kafkajs'));
  }

  public async listen(callback: () => void): Promise<void> {
    this.client = this.createClient();
    await this.start(callback);
  }

  public close(): void {
    this.consumer && this.consumer.disconnect();
    this.producer && this.producer.disconnect();
    this.consumer = null;
    this.producer = null;
    this.client = null;
  }

  public async start(callback: () => void): Promise<void> {
    // create consumer and producer
    this.consumer = this.client.consumer(Object.assign(this.options.consumer || {}, {
      groupId: this.groupId
    }));

    this.producer =  this.client.producer(this.options.producer);

    await this.consumer.connect();
    await this.producer.connect();
    await this.bindEvents(this.consumer);
    callback();
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.Kafka(Object.assign(this.options.client || {}, {
      clientId: this.clientId,
      brokers: this.brokers,
      logCreator: KafkaLogger.bind(null, this.logger),
    }) as KafkaConfig);
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    await Promise.all(registeredPatterns.map(async pattern => {
      // subscribe to the pattern of the topic
      await consumer.subscribe({
        topic: pattern
      });
    }));

    await consumer.run(Object.assign(this.options.run || {}, {
      eachMessage: this.getMessageHandler()
    }));
  }

  public getMessageHandler(): Function {
    return async (payload: EachMessagePayload) => {
      return this.handleMessage(payload);
    };
  }

  public getPublisher(replyTopic: string, replyPartition: string, correlationId: string): any {
    return (data: any) =>
      this.sendMessage(
        data,
        replyTopic,
        replyPartition,
        correlationId
      );
  }

  public async handleMessage(
    payload: EachMessagePayload
  ) {
    // create data from a deserialized payload
    const message = KafkaSerializer.deserialize<KafkaMessage>(Object.assign(payload.message, {
      topic: payload.topic,
      partition: payload.partition
    }));

    // construct packet
    const packet: ReadPacket<KafkaMessage> & PacketId = {
      id: undefined,
      pattern: payload.topic,
      data: message
    };

    // reply variables
    let replyTopic;
    let replyPartition;

    // parse the correlation id
    if (!isUndefined(packet.data.headers[KafkaHeaders.CORRELATION_ID])) {
      // assign the correlation id as the packet id
      packet.id = packet.data.headers[KafkaHeaders.CORRELATION_ID].toString();

      // parse the topic and partition
      if (!isUndefined(packet.data.headers[KafkaHeaders.REPLY_TOPIC])) {
        replyTopic = packet.data.headers[KafkaHeaders.REPLY_TOPIC].toString();
      }

      if (!isUndefined(packet.data.headers[KafkaHeaders.REPLY_PARTITION])) {
        replyPartition = packet.data.headers[KafkaHeaders.REPLY_PARTITION].toString();
      }
    }

    // if the correlation id or reply topic is not set then this is a pattern (events could still have correlation id)
    if (!packet.id || !replyTopic) {
      return this.handleEvent(packet.pattern, packet);
    }

    // create the publisher
    const publish = this.getPublisher(replyTopic, replyPartition, packet.id);

    // get the handler for more
    const handler = this.getHandlerByPattern(packet.pattern);

    // return an error when there isn't a handler
    if (!handler) {
      return publish({
        id: packet.id,
        err: NO_MESSAGE_HANDLER
      });
    }

    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;

    response$ && this.send(response$, publish);
  }

  public sendMessage(
    packet: WritePacket & PacketId,
    replyTopic: string,
    replyPartition: string,
    correlationId: string
  ): void {
    // make sure the response is an object and if not then set the value as such
    packet.response = KafkaSerializer.serialize<Message>(packet.response);

    // assign partition
    if (!isNil(replyPartition)) {
      packet.response.partition = replyPartition;
    }

    // set the correlation id
    packet.response.headers[KafkaHeaders.CORRELATION_ID] = Buffer.from(correlationId);

    // set the nest error headers if it exists
    if (packet.err) {
      packet.response.headers[KafkaHeaders.NESTJS_ERR] = Buffer.from(packet.err);
    }

    // set the nest is disposed header
    if (packet.isDisposed) {
      packet.response.headers[KafkaHeaders.NESTJS_IS_DISPOSED] = Buffer.alloc(1);
    }

    // send
    this.producer.send(Object.assign({
      topic: replyTopic,
      messages: [packet.response]
    }, this.options.send || {}));
  }
}
