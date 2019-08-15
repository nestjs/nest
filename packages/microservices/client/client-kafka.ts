import * as util from 'util';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Observable } from 'rxjs';

import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP
} from '../constants';
import { ReadPacket, KafkaOptions, WritePacket, PacketId } from '../interfaces';
import { ClientProxy } from './client-proxy';

import {
  KafkaConfig,
  Kafka,
  Producer,
  Consumer,
  EachMessagePayload,
  Message,
  KafkaMessage,
  logLevel
} from '../external/kafka.interface';
import { KafkaHeaders } from '../enums';

interface KafkaPacket {
  replyTopic?: string;
  replyPartition?: number;
}

let kafkaPackage: any = {};

export class ClientKafka extends ClientProxy {
  protected readonly logger = new Logger(ClientKafka.name);
  private client: Kafka = null;
  private consumer: Consumer = null;
  private producer: Producer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  constructor(protected readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options.client, 'brokers') || [KAFKA_DEFAULT_BROKER];

    // append a unique id to the clientId and groupId so they don't collide with a microservices client
    this.clientId = (this.getOptionsProp(this.options.client, 'clientId') || KAFKA_DEFAULT_CLIENT) + '-client';

    // @TODO: Fix the type for consumer options.  I don't know why I am getting type errors with this.options.consumer
    this.groupId = (this.getOptionsProp(this.options.consumer as any, 'groupId') || KAFKA_DEFAULT_GROUP) + '-client';

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () => require('kafkajs'));
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
    this.consumer = this.client.consumer(Object.assign(this.options.consumer || {}, {
      groupId: this.groupId
    }));

    await this.producer.connect();
    await this.consumer.connect();

    // @TODO: Use descriptors to define the reply topics
    // Run the consumer
    await this.consumer.subscribe({topic: 'math.sum.reply'});
    await this.consumer.run(Object.assign(this.options.run || {}, {
      eachMessage: this.createResponseCallback()
    }));

    return this.producer;
  }

  public createClient<T = any>(): T {
    const kafkaLogger = kafkaLogLevel => ({namespace, level, label, log}) => {
      let loggerMethod: string;

      switch (level) {
        case logLevel.ERROR:
        case logLevel.NOTHING:
          loggerMethod = 'error';
          break;
        case logLevel.WARN:
          loggerMethod = 'warn';
          break;
        case logLevel.INFO:
          loggerMethod = 'log';
          break;
        case logLevel.DEBUG:
        default:
          loggerMethod = 'debug';
          break;
      }

      const { message, ...others } = log;
      this.logger[loggerMethod](`${label} [${namespace}] ${message} ${JSON.stringify(others)}`);
    };

    return new kafkaPackage.Kafka(Object.assign(this.options.client || {}, {
      clientId: this.clientId,
      brokers: this.brokers,
      logCreator: kafkaLogger,
    }) as KafkaConfig);
  }

  public createResponseCallback(): (payload: EachMessagePayload) => any {
    return (payload: EachMessagePayload) => {
      // const { err, response, isDisposed, id } = JSON.parse(
      //   buffer.toString(),
      // ) as WritePacket & PacketId;

      const packet = this.deserialize(payload);

      this.logger.error(util.format('createResponseCallback() fn() packet: %o', packet));

      const callback = this.routingMap.get(packet.id);

      this.logger.error(util.format('createResponseCallback() fn() this.routingMap: %o', this.routingMap));
      this.logger.error(util.format('createResponseCallback() fn() callback: %o', callback));

      if (!callback) {
        return undefined;
      }

      // @TODO: Figure out how isDisposed is supposed to work.
      callback({
        err: null,
        response: packet.response
      });

      callback({
        isDisposed: true
      });
    };
  }

  private deserialize(payload: EachMessagePayload): WritePacket<Message> & PacketId {
    // build
    const packet = {
      id: undefined,
      pattern: payload.topic,
      response: Object.assign(payload.message, {
        topic: payload.topic,
        partition: payload.partition
      })
    };

    // parse the correlation id
    if (!isUndefined(packet.response.headers[KafkaHeaders.CORRELATION_ID])) {
      // assign the correlation id as the packet id
      packet.id = packet.response.headers[KafkaHeaders.CORRELATION_ID].toString();
    }

    return packet;
  }

  protected dispatchEvent(packet: ReadPacket & PacketId): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);

    // assign a packet id
    packet = this.assignPacketId(packet);

    // create headers if they don't exist
    if (isUndefined(packet.data.headers)){
      packet.data.headers = {};
    }

    // correlate
    packet.data.headers[KafkaHeaders.CORRELATION_ID] = packet.id;

    // send
    return this.producer.send(Object.assign({
      topic: pattern,
      messages: [packet.data]
    }, this.options.send || {}));
  }

  private getReplyTopic(pattern: string): string {
    return `${pattern}.reply`;
  }

  private getReplyPartition(topic: string): string {
    // this.consumer.describeGroup().then((description) => {
    //   this.logger.error(util.format('getReplyTopicPartition(): topic: %s groupDescription: %o', topic, description));
    // });

    return '0';
  }

  // private getReplyTopic

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const replyTopic = this.getReplyTopic(pattern);
      const replyPartition = this.getReplyPartition(replyTopic);

      // subscribe
      // this.consumer.subscribe({
      //   topic: replyTopic
      // }).then(() => {
      //   return this.consumer.run(Object.assign(this.options.run || {}, {
      //     eachMessage: this.createResponseCallback()
      //   }));
      // });

      // set the route
      this.routingMap.set(packet.id, callback);

      // create headers if they don't exist
      if (isUndefined(packet.data.headers)){
        packet.data.headers = {};
      }

      // correlate
      packet.data.headers[KafkaHeaders.CORRELATION_ID] = packet.id;
      packet.data.headers[KafkaHeaders.REPLY_TOPIC] = replyTopic;
      packet.data.headers[KafkaHeaders.REPLY_PARTITION] = replyPartition;

      this.logger.error(util.format('publish() packet %o', packet));

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
      this.logger.error(err);
    }
  }
}
