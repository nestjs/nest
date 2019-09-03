import { Logger } from '@nestjs/common/services/logger.service';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { KafkaHeaders } from '../enums';
import {
  Consumer,
  ConsumerConfig,
  EachMessagePayload,
  Kafka,
  KafkaConfig,
  KafkaMessage,
  Message,
  Producer,
} from '../external/kafka.interface';
import { KafkaLogger, KafkaParser } from '../helpers';
import {
  CustomTransportStrategy,
  KafkaOptions,
  OutgoingResponse,
} from '../interfaces';
import { Server } from './server';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(ServerKafka.name);
  protected client: Kafka = null;
  protected consumer: Consumer = null;
  protected producer: Producer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  constructor(private readonly options: KafkaOptions['options']) {
    super();

    const clientOptions =
      this.getOptionsProp(this.options, 'client') || ({} as KafkaConfig);
    const consumerOptions =
      this.getOptionsProp(this.options, 'consumer') || ({} as ConsumerConfig);

    this.brokers = clientOptions.brokers || [KAFKA_DEFAULT_BROKER];

    // append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions.clientId || KAFKA_DEFAULT_CLIENT) + '-server';
    this.groupId = (consumerOptions.groupId || KAFKA_DEFAULT_GROUP) + '-server';

    kafkaPackage = this.loadPackage('kafkajs', ServerKafka.name, () =>
      require('kafkajs'),
    );

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
    const consumerOptions = Object.assign(this.options.consumer || {}, {
      groupId: this.groupId,
    });
    this.consumer = this.client.consumer(consumerOptions);
    this.producer = this.client.producer(this.options.producer);

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
    const subscribeToPattern = async (pattern: string) =>
      consumer.subscribe({
        topic: pattern,
      });

    await Promise.all(registeredPatterns.map(subscribeToPattern));

    const consumerRunOptions = Object.assign(this.options.run || {}, {
      eachMessage: this.getMessageHandler(),
    });
    await consumer.run(consumerRunOptions);
  }

  public getMessageHandler(): Function {
    return async (payload: EachMessagePayload) => this.handleMessage(payload);
  }

  public getPublisher(
    replyTopic: string,
    replyPartition: string,
    correlationId: string,
  ): (data: any) => any {
    return (data: any) =>
      this.sendMessage(data, replyTopic, replyPartition, correlationId);
  }

  public async handleMessage(payload: EachMessagePayload) {
    const channel = payload.topic;
    const rawMessage = KafkaParser.parse<KafkaMessage>(
      Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition,
      }),
    );

    const { headers } = rawMessage;
    const correlationId = (headers[
      KafkaHeaders.CORRELATION_ID
    ] as unknown) as string;
    const replyTopic = (headers[KafkaHeaders.REPLY_TOPIC] as unknown) as string;
    const replyPartition = (headers[
      KafkaHeaders.REPLY_PARTITION
    ] as unknown) as string;

    const packet = this.deserializer.deserialize(rawMessage, { channel });

    // if the correlation id or reply topic is not set
    // then this is an event (events could still have correlation id)
    if (!correlationId || !replyTopic) {
      return this.handleEvent(packet.pattern, packet);
    }

    const publish = this.getPublisher(
      replyTopic,
      replyPartition,
      correlationId,
    );
    const handler = this.getHandlerByPattern(packet.pattern);
    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
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
    correlationId: string,
  ): void {
    const outgoingResponse = this.serializer.serialize(
      (message as unknown) as OutgoingResponse,
    );

    const outgoingMessage = KafkaParser.stringify<Message>(
      outgoingResponse.response,
    );
    this.assignReplyPartition(replyPartition, outgoingMessage);
    this.assignCorrelationIdHeader(correlationId, outgoingMessage);
    this.assignErrorHeader(outgoingResponse, outgoingMessage);
    this.assignIsDisposedHeader(outgoingResponse, outgoingMessage);

    const replyMessage = Object.assign(
      {
        topic: replyTopic,
        messages: [outgoingMessage],
      },
      this.options.send || {},
    );
    this.producer.send(replyMessage);
  }

  public assignIsDisposedHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
    if (!outgoingResponse.isDisposed) {
      return;
    }
    outgoingMessage.headers[KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
  }

  public assignErrorHeader(
    outgoingResponse: OutgoingResponse,
    outgoingMessage: Message,
  ) {
    if (!outgoingResponse.err) {
      return;
    }
    outgoingMessage.headers[KafkaHeaders.NEST_ERR] = Buffer.from(
      outgoingResponse.err,
    );
  }

  public assignCorrelationIdHeader(
    correlationId: string,
    outgoingMessage: Message,
  ) {
    outgoingMessage.headers[KafkaHeaders.CORRELATION_ID] = Buffer.from(
      correlationId,
    );
  }

  public assignReplyPartition(
    replyPartition: string,
    outgoingMessage: Message,
  ) {
    if (isNil(replyPartition)) {
      return;
    }
    outgoingMessage.partition = parseFloat(replyPartition);
  }
}
