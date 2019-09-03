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
  Message
} from '../external/kafka.interface';
import { CustomTransportStrategy, KafkaOptions, ReadPacket, PacketId, WritePacket, IncomingRequest, OutgoingResponse } from '../interfaces';
import { KafkaHeaders } from '../enums';
import { Server } from './server';

import { KafkaParser, KafkaLogger } from '../helpers';

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

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
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
    let correlationId;
    let replyTopic;
    let replyPartition;

    const channel = payload.topic;
    const rawMessage = KafkaParser.parse<KafkaMessage>(Object.assign(payload.message, {
      topic: payload.topic,
      partition: payload.partition
    }));

    // parse the correlation id
    if (!isUndefined(rawMessage.headers[KafkaHeaders.CORRELATION_ID])) {
      // assign the correlation id as the packet id
      correlationId = rawMessage.headers[KafkaHeaders.CORRELATION_ID];

      if (!isUndefined(rawMessage.headers[KafkaHeaders.REPLY_TOPIC])) {
        replyTopic = rawMessage.headers[KafkaHeaders.REPLY_TOPIC];
      }

      if (!isUndefined(rawMessage.headers[KafkaHeaders.REPLY_PARTITION])) {
        replyPartition = rawMessage.headers[KafkaHeaders.REPLY_PARTITION];
      }
    }

    // deserialize
    const packet = this.deserializer.deserialize(rawMessage, { channel });

    // if the correlation id or reply topic is not set then this is an event (events could still have correlation id)
    if (!correlationId || !replyTopic) {
      return this.handleEvent(packet.pattern, packet);
    }

    // create the publisher
    const publish = this.getPublisher(replyTopic, replyPartition, correlationId);

    // get the handler for more
    const handler = this.getHandlerByPattern(packet.pattern);

    // return an error when there isn't a handler
    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER
      });
    }

    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;

    response$ && this.send(response$, publish);
  }

  public sendMessage<T = any>(
    message: T,
    replyTopic: string,
    replyPartition: string,
    correlationId: string
  ): void {
    const outgoingResponse = this.serializer.serialize(
      (message as unknown) as OutgoingResponse,
    );

    // make sure the response is an object and if not then set the value as such
    const outgoingMessage = KafkaParser.stringify<Message>(outgoingResponse.response);

    // assign partition
    if (!isNil(replyPartition)) {
      outgoingMessage.partition = parseFloat(replyPartition);
    }

    // set the correlation id
    outgoingMessage.headers[KafkaHeaders.CORRELATION_ID] = Buffer.from(correlationId);

    // set the nest error headers if it exists
    if (outgoingResponse.err) {
      outgoingMessage.headers[KafkaHeaders.NESTJS_ERR] = Buffer.from(outgoingResponse.err);
    }

    // set the nest is disposed header
    if (outgoingResponse.isDisposed) {
      outgoingMessage.headers[KafkaHeaders.NESTJS_IS_DISPOSED] = Buffer.alloc(1);
    }

    // send
    this.producer.send(Object.assign({
      topic: replyTopic,
      messages: [outgoingMessage]
    }, this.options.send || {}));
  }
}
