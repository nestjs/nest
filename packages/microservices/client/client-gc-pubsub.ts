import { Logger } from '@nestjs/common/services/logger.service';
import { ClientProxy } from './client-proxy';
import { GCPubSubOptions, ReadPacket, WritePacket } from '../interfaces';
import {
  ErrorCode,
  Message,
  PublishConfig,
  PubSub,
  PubSubConfig,
  SubscriberConfig,
  Subscription,
  Topic,
} from '../external/gc-pubsub.interface';
import {
  ERROR_EVENT,
  GC_PUBSUB_DEFAULT_CLIENT_CONFIG,
  GC_PUBSUB_DEFAULT_PUBLISHER_CONFIG,
  GC_PUBSUB_DEFAULT_REPLY_SUBSCRIPTION,
  GC_PUBSUB_DEFAULT_REPLY_TOPIC,
  GC_PUBSUB_DEFAULT_SUBSCRIBER_CONFIG,
  GC_PUBSUB_DEFAULT_TOPIC,
  MESSAGE_EVENT,
} from '../constants';
import { loadPackage } from '../../common/utils/load-package.util';

let gcPubSubPackage: any = {};

export class ClientGCPubSub extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);

  protected readonly topicName: string;
  protected readonly publisherConfig: PublishConfig;
  protected readonly replyTopicName: string;
  protected readonly clientConfig: PubSubConfig;
  protected readonly replySubscriptionName: string;
  protected readonly subscriberConfig: SubscriberConfig;

  protected client: PubSub | null = null;
  protected replySubscription: Subscription | null = null;
  protected topic: Topic | null = null;

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

    this.replyTopicName = this.getOptionsProp(
      this.options,
      'replyTopic',
      GC_PUBSUB_DEFAULT_REPLY_TOPIC,
    );

    this.replySubscriptionName = this.getOptionsProp(
      this.options,
      'replySubscription',
      GC_PUBSUB_DEFAULT_REPLY_SUBSCRIPTION,
    );

    gcPubSubPackage = loadPackage(
      '@google-cloud/pubsub',
      ClientGCPubSub.name,
      () => require('@google-cloud/pubsub'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async close(): Promise<void> {
    this.replySubscription && (await this.replySubscription.close());
    this.client && (await this.client.close());
    this.client = null;
    this.topic = null;
    this.replySubscription = null;
  }

  async connect(): Promise<PubSub> {
    if (this.client) {
      return this.client;
    }

    this.client = this.createClient();

    this.topic = this.client.topic(this.topicName, this.publisherConfig);

    const replyTopic = this.client.topic(this.replyTopicName);

    await this.createIfNotExists(replyTopic.create.bind(replyTopic));

    this.replySubscription = replyTopic.subscription(
      this.replySubscriptionName,
      this.subscriberConfig,
    );

    await this.createIfNotExists(
      this.replySubscription.create.bind(this.replySubscription),
    );

    this.replySubscription
      .on(MESSAGE_EVENT, async (message: Message) => {
        await this.handleResponse(message);
        if (this.subscriberConfig.noAck) {
          message.ack();
        }
      })
      .on(ERROR_EVENT, (err: any) => this.logger.error(err));

    return this.client;
  }

  public createClient(): PubSub {
    return new gcPubSubPackage.PubSub(this.clientConfig);
  }

  protected async dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);

    const serializedPacket = this.serializer.serialize({
      ...packet,
      pattern,
    });

    await this.topic.publishJSON(serializedPacket);
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);

      const serializedPacket = this.serializer.serialize(packet);
      this.routingMap.set(packet.id, callback);

      this.topic
        .publishJSON(serializedPacket, {
          replyTo: this.replyTopicName,
        })
        .catch(err => callback({ err }));

      return () => this.routingMap.delete(packet.id);
    } catch (err) {
      callback({ err });
    }
  }

  public async handleResponse(message: Message) {
    const { data } = message;
    const rawMessage = JSON.parse(data.toString());

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
}
