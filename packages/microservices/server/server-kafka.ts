import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP
} from '../constants';
import {
  KafkaConfig,
  Kafka,
  Consumer,
  ConsumerConfig
} from '../external/kafka.interface';
import { CustomTransportStrategy, KafkaOptions } from '../interfaces';
import { Server } from './server';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  private client: Kafka = null;
  private consumer: Consumer = null;
  private readonly brokers: string[];
  private readonly clientId: string;
  private readonly groupId: string;

  constructor(private readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options.client, 'brokers') || [KAFKA_DEFAULT_BROKER];
    this.clientId = this.getOptionsProp(this.options.client, 'clientId') || KAFKA_DEFAULT_CLIENT;
    this.groupId = this.getOptionsProp(this.options.consumer, 'groupId') || KAFKA_DEFAULT_GROUP;

    kafkaPackage = this.loadPackage('kafkajs', ServerKafka.name, () => require('kafkajs'));
  }

  public async listen(callback: () => void): Promise<void> {
    this.client = this.createClient();
    await this.start(callback);
  }

  public close(): void {
    this.consumer && this.consumer.disconnect();
  }

  public async start(callback: () => void): Promise<void> {
    this.consumer = this.client.consumer(Object.assign(this.options.consumer || {}, {
      groupId: this.groupId
    }));

    await this.consumer.connect();
    await this.bindEvents(this.consumer);
    callback();
  }

  public createClient<T = any>(): T {
    return new kafkaPackage(Object.assign(this.options.client || {}, {
      brokers: this.brokers,
      clientId: this.clientId
    }) as KafkaConfig);
  }

  public async bindEvents(consumer: Consumer) {
    const registeredPatterns = [...this.messageHandlers.keys()];
    registeredPatterns.forEach(pattern => {
      // const { isEventHandler } = this.messageHandlers.get(pattern);
      // consumer.subscribe(pattern as ConsumerConfig);
      this.logger.error(pattern);
    });
  }

  /**
   * Will create a string of a JSON serialized format.
   *
   * @param topic The topic the consumer is subscribing to.
   * @param fromBeginning Whether or not to stream from begining.
   * @returns The stringified pattern.
   */
  // public createPattern(
  //   topic: string,
  //   fromBeginning?: boolean
  // ): string {
  //   return JSON.stringify({
  //     topic,
  //     fromBeginning
  //   });
  // }
}
