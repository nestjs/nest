import { Logger } from '@nestjs/common/services/logger.service';
import {
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_CLIENT,
  KAFKA_DEFAULT_GROUP
} from '../constants';
import {
  KafkaConfig,
  Kafka,
  Consumer,
  EachMessagePayload,
  logLevel
} from '../external/kafka.interface';
import { CustomTransportStrategy, KafkaOptions } from '../interfaces';
import { Server } from './server';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  protected readonly logger = new Logger(ServerKafka.name);
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
    this.consumer = null;
    this.client = null;
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
      logLevel: logLevel.INFO,
      logCreator: kafkaLogger,
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

  public async handleMessage(
    payload: EachMessagePayload
  ) {
    return this.handleEvent(payload.topic, {
      pattern: payload.topic,
      data: payload
    });
  }
}
