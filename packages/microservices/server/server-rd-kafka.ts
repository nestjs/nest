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
import { RdKafkaContext } from '../ctx-host';
import { KafkaRequestDeserializer } from '../deserializers/kafka-request.deserializer';
import { KafkaHeaders, Transport } from '../enums';
import { KafkaRetriableException } from '../exceptions';
import {
  KafkaConsumer as Consumer, // not sure why this isn't just Consumer like it is for Producer
  Client,
  Message,
  ConsumerGlobalConfig,
  GlobalConfig,
  HighLevelProducer,
  MessageHeader,
} from '../external/rd-kafka.interface';
import { KafkaLogger, KafkaParser } from '../helpers';
import {
  CustomTransportStrategy,
  RdKafkaOptions,
  OutgoingResponse,
  ReadPacket,
} from '../interfaces';
import { KafkaRequestSerializer } from '../serializers/kafka-request.serializer';
import { Server } from './server';

let kafkaPackage: any = {};

export class ServerRdKafka extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.RD_KAFKA;

  protected logger = new Logger(ServerRdKafka.name);
  // not sure if the client is needed since the producer and consumer are subtypes of the client?
  // protected client: Client<any> = null;

  protected consumer: Consumer = null;
  protected producer: HighLevelProducer = null;

  protected parser: KafkaParser = null;

  protected brokers: string;
  protected clientId: string;
  protected groupId: string;

  constructor(protected readonly options: RdKafkaOptions['options']) {
    super();

    const clientOptions =
      this.getOptionsProp(this.options, 'client') || ({} as GlobalConfig);

    const consumerOptions =
      this.getOptionsProp(this.options, 'consumer') || ({} as ConsumerGlobalConfig);

    const postfixId =
      this.getOptionsProp(this.options, 'postfixId') ?? '-server';

    this.brokers = clientOptions['metadata.broker.list'] || KAFKA_DEFAULT_BROKER;

    // append a unique id to the clientId and groupId
    // so they don't collide with a microservices client
    this.clientId =
      (clientOptions['client.id'] || KAFKA_DEFAULT_CLIENT) + postfixId;

    this.groupId = (consumerOptions['group.id'] || KAFKA_DEFAULT_GROUP) + postfixId;

    kafkaPackage = this.loadPackage('@confluentinc/kafka-javascript', ServerRdKafka.name, () =>
      require('@confluentinc/kafka-javascript'),
    );

    this.parser = new KafkaParser((options && options.parser) || undefined);

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
    try {
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public async close(): Promise<void> {
    // TODO: figure out how to properly close the consumer and producer
    this.consumer && (await this.disconnect(this.consumer));
    this.producer && (await this.disconnect(this.producer));
    this.consumer = null;
    this.producer = null;
  }

  public async disconnect(client: Client<any>): Promise<void> {
    // wrapping with a promise to avoid creating event handlers manually for the disconnect
    return new Promise((resolve, reject) => {
      return client.disconnect((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async start(callback: () => void): Promise<void> {
    const consumerOptions = Object.assign({}, this.options.client || {}, this.options.consumer || {}, {
      'client.id': this.clientId,
      'metadata.broker.list': this.brokers,
      'group.id': this.groupId,
    });
    this.consumer = new Consumer(consumerOptions);

    const producerOptions = Object.assign({}, this.options.client || {}, this.options.producer || {}, {
      'client.id': this.clientId,
      'metadata.broker.list': this.brokers
    });
    this.producer = new HighLevelProducer(producerOptions);

    await this.connect(this.producer);

    // connect and bind the events to the consumer
    await this.connect(this.consumer);
    await this.bindEvents(this.consumer);

    callback();
  }

  public async connect(client: Client<any>): Promise<void> {
    // wrapping with a promise to avoid creating event handlers manually for the connect
    return new Promise((resolve, reject) => {
      return client.connect({
        // TODO: make this more efficient by only getting metadata for the topics we care about
        allTopics: true,
      }, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    
    if (registeredPatterns.length > 0) {
      this.consumer.subscribe(registeredPatterns);
    }

    consumer.on('data', this.getMessageHandler());

    // start handling messages
    consumer.consume();
  }

  public getMessageHandler() {
    return async (payload: Message) => this.handleMessage(payload);
  }

  public getPublisher(
    replyTopic: string,
    replyPartition: number,
    correlationId: string,
  ): (data: any) => Promise<unknown> {
    return (data: any) =>
      this.sendMessage(data, replyTopic, replyPartition, correlationId);
  }

  public async handleMessage(message: Message) {
    const channel = message.topic;
    const rawMessage = this.parser.parse<Message>(message);
    const headers = rawMessage.headers as unknown as Record<string, any>;
    const correlationId = headers[KafkaHeaders.CORRELATION_ID];
    const replyTopic = headers[KafkaHeaders.REPLY_TOPIC];
    const replyPartition = headers[KafkaHeaders.REPLY_PARTITION];

    const packet = await this.deserializer.deserialize(rawMessage, { channel });
    const kafkaContext = new RdKafkaContext([
      rawMessage,
      message.partition,
      message.topic,
      this.consumer,
      this.producer
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
    );

    if (!handler) {
      return publish({
        id: correlationId,
        err: NO_MESSAGE_HANDLER,
      });
    }

    const response$ = this.transformToObservable(
      handler(packet.data, kafkaContext),
    );

    const replayStream$ = new ReplaySubject();
    await this.combineStreamsAndThrowIfRetriable(response$, replayStream$);

    this.send(replayStream$, publish);
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
    outgoingResponse: OutgoingResponse,
    replyTopic: string,
    replyPartition: number,
    correlationId: string,
  ): Promise<void> {
    const outgoingMessage = await this.serializer.serialize(outgoingResponse.response);

    const headers: MessageHeader[] = [];

    this.assignCorrelationIdHeader(correlationId, headers);
    this.assignErrorHeader(outgoingResponse, headers);
    this.assignIsDisposedHeader(outgoingResponse, headers);

    // TODO: figure out a better way, rather than using a promise
    return new Promise((resolve, reject) => {
      this.producer.produce(replyTopic, replyPartition, outgoingMessage, null, null, headers, (err, offset) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });


    // return this.producer.produce(replyMessage);
  }

  public assignIsDisposedHeader(
    outgoingResponse: OutgoingResponse,
    headers: MessageHeader[],
  ) {
    if (!outgoingResponse.isDisposed) {
      return;
    }
    // headers[KafkaHeaders.NEST_IS_DISPOSED] = Buffer.alloc(1);
    headers.push({
      [KafkaHeaders.NEST_IS_DISPOSED]: Buffer.alloc(1)
    });
  }

  public assignErrorHeader(
    outgoingResponse: OutgoingResponse,
    headers: MessageHeader[],
  ) {
    if (!outgoingResponse.err) {
      return;
    }
    const stringifiedError =
      typeof outgoingResponse.err === 'object'
        ? JSON.stringify(outgoingResponse.err)
        : outgoingResponse.err;

    // headers[KafkaHeaders.NEST_ERR] = Buffer.from(stringifiedError);
    headers.push({
      [KafkaHeaders.NEST_ERR]: Buffer.from(stringifiedError)
    });
  }

  public assignCorrelationIdHeader(
    correlationId: string,
    headers: MessageHeader[],
  ) {
    // headers.push[KafkaHeaders.CORRELATION_ID] = Buffer.from(correlationId);
    headers.push({
      [KafkaHeaders.CORRELATION_ID]: Buffer.from(correlationId)
    });
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: RdKafkaContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }
    const resultOrStream = await handler(packet.data, context);
    if (isObservable(resultOrStream)) {
      await lastValueFrom(resultOrStream);
    }
  }

  protected initializeSerializer(options: RdKafkaOptions['options']) {
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer();
  }

  protected initializeDeserializer(options: RdKafkaOptions['options']) {
    this.deserializer = options?.deserializer ?? new KafkaRequestDeserializer();
  }
}
