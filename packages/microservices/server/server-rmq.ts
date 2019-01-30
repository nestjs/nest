import { isString, isUndefined } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  DISCONNECT_EVENT,
  NO_EVENT_HANDLER,
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '../constants';
import { CustomTransportStrategy, ReadPacket, RmqOptions } from '../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let rqmPackage: any = {};

export class ServerRMQ extends Server implements CustomTransportStrategy {
  private server: any = null;
  private channel: any = null;
  private readonly urls: string[];
  private readonly queue: string;
  private readonly prefetchCount: number;
  private readonly queueOptions: any;
  private readonly isGlobalPrefetchCount: boolean;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.urls = this.getOptionsProp<RmqOptions>(this.options, 'urls') || [
      RQM_DEFAULT_URL,
    ];
    this.queue =
      this.getOptionsProp<RmqOptions>(this.options, 'queue') ||
      RQM_DEFAULT_QUEUE;
    this.prefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'prefetchCount') ||
      RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'isGlobalPrefetchCount') ||
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
    this.queueOptions =
      this.getOptionsProp<RmqOptions>(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;

    this.loadPackage('amqplib', ServerRMQ.name, () => require('amqplib'));
    rqmPackage = this.loadPackage(
      'amqp-connection-manager',
      ServerRMQ.name,
      () => require('amqp-connection-manager'),
    );
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
    this.server.on(CONNECT_EVENT, (_: any) => {
      this.channel = this.server.createChannel({
        json: false,
        setup: (channel: any) => this.setupChannel(channel, callback),
      });
    });
    this.server.on(DISCONNECT_EVENT, (err: any) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
    });
  }

  public createClient<T = any>(): T {
    return rqmPackage.connect(this.urls);
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

  public async handleEvent(pattern: string, packet: ReadPacket): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER);
    }
    await handler(packet.data);
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
