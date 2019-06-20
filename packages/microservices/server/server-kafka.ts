import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  DISCONNECT_EVENT,
  NO_MESSAGE_HANDLER,
  READY_EVENT,
  DISCONNECTED_EVENT,
  KAFKA_DEFAULT_BROKER,
  KAFKA_DEFAULT_GROUP
} from '../constants';
import { CustomTransportStrategy, KafkaOptions } from '../interfaces';
import { Server } from './server';

let kafkaPackage: any = {};

export class ServerKafka extends Server implements CustomTransportStrategy {
  private server: any = null;
  private channel: any = null;
  private readonly brokers: brokers;
  private readonly clientId: string;

  constructor(private readonly options: KafkaOptions['options']) {
    super();
    this.brokers = this.getOptionsProp(this.options, 'brokers') || [KAFKA_DEFAULT_BROKER];
    this.clientId = this.getOptionsProp(this.options, 'clientId') || KAFKA_DEFAULT_CLIENT;

    kafkaPackage = this.loadPackage('kafkajs', ServerKafka.name, () => require('kafkajs'));
  }

  public async listen(callback: () => void): Promise<void> {
    await this.start(callback);
  }

  public close(): void {
    this.channel && this.channel.close();
    this.server && this.server.close();
  }

  public async start(callback?: () => void) {
    this.server = this.createClient();
    this.server.connect();

    this.server.on(READY_EVENT, (_: any) => {
      this.channel = this.server.createChannel({
        json: false,
        setup: (channel: any) => this.setupChannel(channel, callback),
      });
    });
  }

  public createClient<T = any>(): T {
    return new kafkaPackage.KafkaConsumer(this.options);
  }

  public async setupChannel(channel: any, callback: Function) {
    await channel.assertQueue(this.queue, this.queueOptions);
    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    channel.consume(this.queue, (msg: any) => this.handleMessage(msg), {
      noAck: true,
    });
    callback();
  }

  public async handleMessage(message: any): Promise<void> {
    const { content, properties } = message;
    const packet = JSON.parse(content.toString());
    const pattern = isString(packet.pattern)
      ? packet.pattern
      : JSON.stringify(packet.pattern);

    if (isUndefined(packet.id)) {
      return this.handleEvent(pattern, packet);
    }
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      return this.sendMessage(
        { status, err: NO_MESSAGE_HANDLER },
        properties.replyTo,
        properties.correlationId,
      );
    }
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;

    const publish = <T>(data: T) =>
      this.sendMessage(data, properties.replyTo, properties.correlationId);

    response$ && this.send(response$, publish);
  }

  public sendMessage<T = any>(
    message: T,
    replyTo: any,
    correlationId: string,
  ): void {
    const buffer = Buffer.from(JSON.stringify(message));
    this.channel.sendToQueue(replyTo, buffer, { correlationId });
  }
}
