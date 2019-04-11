import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { EventEmitter } from 'events';
import { fromEvent, merge, Observable } from 'rxjs';
import { first, map, share, switchMap } from 'rxjs/operators';
import { ClientOptions, ReadPacket, RmqOptions } from '../interfaces';
import {
  DISCONNECT_EVENT,
  ERROR_EVENT,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from './../constants';
import { WritePacket } from './../interfaces';
import { ClientProxy } from './client-proxy';

let rqmPackage: any = {};

const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

export class ClientRMQ extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected connection: Promise<any>;
  protected client: any = null;
  protected channel: any = null;
  protected urls: string[];
  protected queue: string;
  protected queueOptions: any;
  protected responseEmitter: EventEmitter;

  constructor(protected readonly options: ClientOptions['options']) {
    super();
    this.urls = this.getOptionsProp<RmqOptions>(this.options, 'urls') || [
      RQM_DEFAULT_URL,
    ];
    this.queue =
      this.getOptionsProp<RmqOptions>(this.options, 'queue') ||
      RQM_DEFAULT_QUEUE;
    this.queueOptions =
      this.getOptionsProp<RmqOptions>(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;

    loadPackage('amqplib', ClientRMQ.name, () => require('amqplib'));
    rqmPackage = loadPackage('amqp-connection-manager', ClientRMQ.name, () =>
      require('amqp-connection-manager'),
    );
  }

  public close(): void {
    this.channel && this.channel.close();
    this.client && this.client.close();
  }

  public consumeChannel() {
    this.channel.addSetup((channel: any) =>
      channel.consume(
        REPLY_QUEUE,
        (msg: any) =>
          this.responseEmitter.emit(msg.properties.correlationId, msg),
        { noAck: true },
      ),
    );
  }

  public connect(): Promise<any> {
    if (this.client) {
      return this.connection;
    }
    this.client = this.createClient();
    this.handleError(this.client);

    const connect$ = this.connect$(this.client);
    this.connection = this.mergeDisconnectEvent(this.client, connect$)
      .pipe(
        switchMap(() => this.createChannel()),
        share(),
      )
      .toPromise();
    return this.connection;
  }

  public createChannel(): Promise<void> {
    return new Promise(resolve => {
      this.channel = this.client.createChannel({
        json: false,
        setup: (channel: any) => this.setupChannel(channel, resolve),
      });
    });
  }

  public createClient<T = any>(): T {
    const socketOptions = this.getOptionsProp<RmqOptions>(this.options, 'socketOptions');
    return rqmPackage.connect(this.urls, socketOptions) as T;
  }

  public mergeDisconnectEvent<T = any>(
    instance: any,
    source$: Observable<T>,
  ): Observable<T> {
    const close$ = fromEvent(instance, DISCONNECT_EVENT).pipe(
      map((err: any) => {
        throw err;
      }),
    );
    return merge(source$, close$).pipe(first());
  }

  public async setupChannel(channel: any, resolve: Function) {
    const prefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'prefetchCount') ||
      RQM_DEFAULT_PREFETCH_COUNT;
    const isGlobalPrefetchCount =
      this.getOptionsProp<RmqOptions>(this.options, 'isGlobalPrefetchCount') ||
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;

    await channel.assertQueue(this.queue, this.queueOptions);
    await channel.prefetch(prefetchCount, isGlobalPrefetchCount);

    this.responseEmitter = new EventEmitter();
    this.responseEmitter.setMaxListeners(0);
    this.consumeChannel();
    resolve();
  }

  public handleError(client: any): void {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public handleMessage(
    packet: WritePacket,
    callback: (packet: WritePacket) => any,
  ) {
    const { err, response, isDisposed } = packet;
    if (isDisposed || err) {
      callback({
        err,
        response: null,
        isDisposed: true,
      });
    }
    callback({
      err,
      response,
    });
  }

  protected publish(
    message: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): Function {
    try {
      const correlationId = randomStringGenerator();
      const listener = ({ content }: { content: any }) =>
        this.handleMessage(JSON.parse(content.toString()), callback);

      Object.assign(message, { id: correlationId });
      this.responseEmitter.on(correlationId, listener);
      this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify(message)),
        {
          replyTo: REPLY_QUEUE,
          correlationId,
        },
      );
      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    return new Promise((resolve, reject) =>
      this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify(packet)),
        {},
        err => (err ? reject(err) : resolve()),
      ),
    );
  }
}
