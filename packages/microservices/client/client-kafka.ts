import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { EventEmitter } from 'events';
import { Observable } from 'rxjs';

import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT
} from '../constants';
import { ReadPacket, KafkaOptions } from '../interfaces';
import { ClientProxy } from './client-proxy';

import {
  KafkaConfig,
  Kafka,
  Producer,
  logLevel
} from '../external/kafka.interface';

let kafkaPackage: any = {};

export class ClientKafka extends ClientProxy {
  protected readonly logger = new Logger(ClientKafka.name);
  private client: Kafka = null;
  private producer: Producer = null;
  protected channel: any = null;
  protected urls: string[];
  protected queue: string;
  protected queueOptions: any;
  protected responseEmitter: EventEmitter;

  private readonly brokers: string[];
  private readonly clientId: string;

  constructor(protected readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options.client, 'brokers') || [KAFKA_DEFAULT_BROKER];
    this.clientId = this.getOptionsProp(this.options.client, 'clientId') || KAFKA_DEFAULT_CLIENT;

    kafkaPackage = loadPackage('kafkajs', ClientKafka.name, () => require('kafkajs'));
  }

  public close(): void {
    this.producer && this.producer.disconnect();
    this.producer = null;
    this.client = null;
  }

  public async connect(): Promise<Producer> {
    if (this.client) {
      return this.producer;
    }
    this.client = this.createClient();
    this.producer = this.client.producer(this.options.producer || {});

    await this.producer.connect();
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

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);

    // wrap the messages in an array
    if (!Array.isArray(packet.data)) {
      packet.data = [packet.data];
    }

    return this.producer.send(Object.assign({
      topic: pattern,
      messages: packet.data
    }, this.options.send || {}));
  }

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    throw new Error(
      'Method is not supported in Kafka mode (learn more in the documentation).',
    );
  }

  protected publish(packet: any, callback: (packet: any) => any): any {
    throw new Error(
      'Method is not supported in Kafka mode (learn more in the documentation).',
    );
  }
}
