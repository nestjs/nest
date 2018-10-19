import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  DISCONNECT_EVENT,
  NO_PATTERN_MESSAGE,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '../constants';
import { CustomTransportStrategy, RmqOptions } from '../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let rqmPackage: any = {};

export class ServerRMQ extends Server implements CustomTransportStrategy {
  private server: any = null;
  private channel: any = null;
  private urls: string[];
  private queue: string;
  private prefetchCount: number;
  private queueOptions: any;
  private isGlobalPrefetchCount: boolean;

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

    rqmPackage = loadPackage('amqp-connection-manager', ServerRMQ.name);
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
    this.server.on(CONNECT_EVENT, _ => {
      this.channel = this.server.createChannel({
        json: false,
        setup: channel => this.setupChannel(channel, callback),
      });
    });
    this.server.on(DISCONNECT_EVENT, err => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
    });
  }

  public createClient<T = any>(): T {
    return rqmPackage.connect(this.urls);
  }

  public async setupChannel(channel: any, callback: Function) {
    await channel.assertQueue(this.queue, this.queueOptions);
    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    channel.consume(this.queue, msg => this.handleMessage(msg), {
      noAck: true,
    });
    callback();
  }

  public async handleMessage(message: any): Promise<void> {
    const { content, properties } = message;
    const packet = JSON.parse(content.toString());
    const pattern = JSON.stringify(packet.pattern);
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      const status = 'error';
      return this.sendMessage(
        { status, err: NO_PATTERN_MESSAGE },
        properties.replyTo,
        properties.correlationId,
      );
    }
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;

    const publish = data =>
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
