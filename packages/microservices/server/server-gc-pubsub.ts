import { Logger } from '@nestjs/common/services/logger.service';
import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { Server } from './server';
import {
  CustomTransportStrategy,
  GCPubSubOptions,
  IncomingRequest,
  OutgoingResponse,
} from '../interfaces';
import {
  PubSub,
  Topic,
  Subscription,
  PublishConfig,
  SubscriberConfig,
  Message,
  PubSubConfig,
  ErrorCode,
} from '../external/gc-pubsub.interface';
import { Transport } from '../enums';
import {
  ERROR_EVENT,
  GC_PUBSUB_DEFAULT_CLIENT_CONFIG,
  GC_PUBSUB_DEFAULT_PUBLISHER_CONFIG,
  GC_PUBSUB_DEFAULT_SUBSCRIBER_CONFIG,
  GC_PUBSUB_DEFAULT_SUBSCRIPTION,
  GC_PUBSUB_DEFAULT_TOPIC,
  MESSAGE_EVENT,
  NO_MESSAGE_HANDLER,
} from '../constants';
import { GCPubSubContext } from '../ctx-host';
import { Observable } from 'rxjs';

let gcPubSubPackage: any = {};

export class ServerGCPubSub extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.GC_PUBSUB;

  protected logger = new Logger(ServerGCPubSub.name);

  protected readonly clientConfig: PubSubConfig;
  protected readonly topicName: string;
  protected readonly publisherConfig: PublishConfig;
  protected readonly subscriptionName: string;
  protected readonly subscriberConfig: SubscriberConfig;

  protected client: PubSub | null = null;
  protected readonly topics: Map<string, Topic> = new Map();
  protected subscription: Subscription | null = null;

  constructor(protected readonly options: GCPubSubOptions['options']) {
    super();

    this.clientConfig = this.getOptionsProp(
      this.options,
      'client',
      GC_PUBSUB_DEFAULT_CLIENT_CONFIG,
    );

    this.topicName = this.getOptionsProp(
      this.options,
      'topic',
      GC_PUBSUB_DEFAULT_TOPIC,
    );

    this.subscriptionName = this.getOptionsProp(
      this.options,
      'subscription',
      GC_PUBSUB_DEFAULT_SUBSCRIPTION,
    );
    this.subscriberConfig = this.getOptionsProp(
      this.options,
      'subscriber',
      GC_PUBSUB_DEFAULT_SUBSCRIBER_CONFIG,
    );

    this.publisherConfig = this.getOptionsProp(
      this.options,
      'publisher',
      GC_PUBSUB_DEFAULT_PUBLISHER_CONFIG,
    );

    gcPubSubPackage = this.loadPackage(
      '@google-cloud/pubsub',
      ServerGCPubSub.name,
      () => require('@google-cloud/pubsub'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(callback: () => void) {
    this.client = this.createClient();
    const topic = this.client.topic(this.topicName);

    await this.createIfNotExists(topic.create.bind(topic));

    this.subscription = topic.subscription(
      this.subscriptionName,
      this.subscriberConfig,
    );

    await this.createIfNotExists(
      this.subscription.create.bind(this.subscription),
    );

    this.subscription
      .on(MESSAGE_EVENT, async (message: Message) => {
        await this.handleMessage(message);
        if (this.subscriberConfig.noAck) {
          message.ack();
        }
      })
      .on(ERROR_EVENT, (err: any) => this.logger.error(err));

    callback();
  }

  public async close() {
    this.subscription && (await this.subscription.close());
    await this.client.close();
  }

  public async handleMessage(message: Message) {
    const { data, attributes } = message;
    const rawMessage = JSON.parse(data.toString());

    const packet = this.deserializer.deserialize(rawMessage);

    const pattern = isString(packet.pattern)
      ? packet.pattern
      : JSON.stringify(packet.pattern);

    const context = new GCPubSubContext([message, pattern]);
    const correlationId = (packet as IncomingRequest).id;

    if (isUndefined(correlationId)) {
      return this.handleEvent(pattern, packet, context);
    }

    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: correlationId,
        status,
        err: NO_MESSAGE_HANDLER,
      };
      return this.sendMessage(
        noHandlerPacket,
        attributes.replyTo,
        correlationId,
      );
    }

    const response$ = this.transformToObservable(
      await handler(packet.data, context),
    ) as Observable<any>;

    const publish = <T>(data: T) =>
      this.sendMessage(data, attributes.replyTo, correlationId);

    response$ && this.send(response$, publish);
  }

  public async sendMessage<T = any>(
    message: T,
    replyTo: string,
    id: string,
  ): Promise<void> {
    Object.assign(message, { id });

    const outgoingResponse = this.serializer.serialize(
      (message as unknown) as OutgoingResponse,
    );

    await this.client
      .topic(replyTo, this.publisherConfig)
      .publishJSON(outgoingResponse);
  }

  public async createIfNotExists(create: () => Promise<any>) {
    try {
      await create();
    } catch (error) {
      if (error.code !== ErrorCode.ALREADY_EXISTS) {
        throw error;
      }
    }
  }

  public createClient() {
    return new gcPubSubPackage.PubSub(this.clientConfig);
  }
}
