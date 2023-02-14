import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { EventEmitter } from 'events';
import {
  EmptyError,
  firstValueFrom,
  fromEvent,
  merge,
  Observable,
  ReplaySubject,
} from 'rxjs';
import { first, map, retryWhen, scan, skip, switchMap } from 'rxjs/operators';
import {
  CONNECT_EVENT,
  CONNECT_FAILED_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  DISCONNECT_EVENT,
  ERROR_EVENT,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '../constants';
import { RmqUrl } from '../external/rmq-url.interface';
import { ReadPacket, RmqOptions, WritePacket } from '../interfaces';
import { RmqRecord } from '../record-builders';
import { RmqRecordSerializer } from '../serializers/rmq-record.serializer';
import { ClientProxy } from './client-proxy';

// import type {
//   AmqpConnectionManager,
//   ChannelWrapper,
// } from 'amqp-connection-manager';
// import type { Channel, ConsumeMessage } from 'amqplib';

type Channel = any;
type ChannelWrapper = any;
type ConsumeMessage = any;
type AmqpConnectionManager = any;

let rqmPackage: any = {};

const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

/**
 * @publicApi
 */
export class ClientRMQ extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected connection$: ReplaySubject<any>;
  protected connection: Promise<any>;
  protected client: AmqpConnectionManager = null;
  protected channel: ChannelWrapper = null;
  protected urls: string[] | RmqUrl[];
  protected queue: string;
  protected queueOptions: Record<string, any>;
  protected responseEmitter: EventEmitter;
  protected replyQueue: string;
  protected persistent: boolean;
  protected noAssert: boolean;

  constructor(protected readonly options: RmqOptions['options']) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue =
      this.getOptionsProp(this.options, 'queue') || RQM_DEFAULT_QUEUE;
    this.queueOptions =
      this.getOptionsProp(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;
    this.replyQueue =
      this.getOptionsProp(this.options, 'replyQueue') || REPLY_QUEUE;
    this.persistent =
      this.getOptionsProp(this.options, 'persistent') || RQM_DEFAULT_PERSISTENT;
    this.noAssert =
      this.getOptionsProp(this.options, 'noAssert') || RQM_DEFAULT_NO_ASSERT;

    loadPackage('amqplib', ClientRMQ.name, () => require('amqplib'));
    rqmPackage = loadPackage('amqp-connection-manager', ClientRMQ.name, () =>
      require('amqp-connection-manager'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public close(): void {
    this.channel && this.channel.close();
    this.client && this.client.close();
    this.channel = null;
    this.client = null;
  }

  public connect(): Promise<any> {
    if (this.client) {
      return this.convertConnectionToPromise();
    }
    this.client = this.createClient();
    this.handleError(this.client);
    this.handleDisconnectError(this.client);

    this.responseEmitter = new EventEmitter();
    this.responseEmitter.setMaxListeners(0);

    const connect$ = this.connect$(this.client);
    const withDisconnect$ = this.mergeDisconnectEvent(
      this.client,
      connect$,
    ).pipe(switchMap(() => this.createChannel()));

    const withReconnect$ = fromEvent(this.client, CONNECT_EVENT).pipe(skip(1));
    const source$ = merge(withDisconnect$, withReconnect$);

    this.connection$ = new ReplaySubject(1);
    source$.subscribe(this.connection$);

    return this.convertConnectionToPromise();
  }

  public createChannel(): Promise<void> {
    return new Promise(resolve => {
      this.channel = this.client.createChannel({
        json: false,
        setup: (channel: Channel) => this.setupChannel(channel, resolve),
      });
    });
  }

  public createClient(): AmqpConnectionManager {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return rqmPackage.connect(this.urls, {
      connectionOptions: socketOptions,
    });
  }

  public mergeDisconnectEvent<T = any>(
    instance: any,
    source$: Observable<T>,
  ): Observable<T> {
    const eventToError = (eventType: string) =>
      fromEvent(instance, eventType).pipe(
        map((err: unknown) => {
          throw err;
        }),
      );
    const disconnect$ = eventToError(DISCONNECT_EVENT);

    const urls = this.getOptionsProp(this.options, 'urls', []);
    const connectFailed$ = eventToError(CONNECT_FAILED_EVENT).pipe(
      retryWhen(e =>
        e.pipe(
          scan((errorCount, error: any) => {
            if (urls.indexOf(error.url) >= urls.length - 1) {
              throw error;
            }
            return errorCount + 1;
          }, 0),
        ),
      ),
    );
    // If we ever decide to propagate all disconnect errors & re-emit them through
    // the "connection" stream then comment out "first()" operator.
    return merge(source$, disconnect$, connectFailed$).pipe(first());
  }

  public async convertConnectionToPromise() {
    try {
      return await firstValueFrom(this.connection$);
    } catch (err) {
      if (err instanceof EmptyError) {
        return;
      }
      throw err;
    }
  }

  public async setupChannel(channel: Channel, resolve: Function) {
    const prefetchCount =
      this.getOptionsProp(this.options, 'prefetchCount') ||
      RQM_DEFAULT_PREFETCH_COUNT;
    const isGlobalPrefetchCount =
      this.getOptionsProp(this.options, 'isGlobalPrefetchCount') ||
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;

    if (!this.queueOptions.noAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }
    await channel.prefetch(prefetchCount, isGlobalPrefetchCount);
    await this.consumeChannel(channel);
    resolve();
  }

  public async consumeChannel(channel: Channel) {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    await channel.consume(
      this.replyQueue,
      (msg: ConsumeMessage) =>
        this.responseEmitter.emit(msg.properties.correlationId, msg),
      {
        noAck,
      },
    );
  }

  public handleError(client: AmqpConnectionManager): void {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public handleDisconnectError(client: AmqpConnectionManager): void {
    client.addListener(DISCONNECT_EVENT, (err: any) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  public async handleMessage(
    packet: unknown,
    callback: (packet: WritePacket) => any,
  );
  public async handleMessage(
    packet: unknown,
    options: Record<string, unknown>,
    callback: (packet: WritePacket) => any,
  );
  public async handleMessage(
    packet: unknown,
    options: Record<string, unknown> | ((packet: WritePacket) => any),
    callback?: (packet: WritePacket) => any,
  ) {
    if (isFunction(options)) {
      callback = options as (packet: WritePacket) => any;
      options = undefined;
    }

    const { err, response, isDisposed } = await this.deserializer.deserialize(
      packet,
      options,
    );
    if (isDisposed || err) {
      callback({
        err,
        response,
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
  ): () => void {
    try {
      const correlationId = randomStringGenerator();
      const listener = ({
        content,
        options,
      }: {
        content: Buffer;
        options: Record<string, unknown>;
      }) =>
        this.handleMessage(JSON.parse(content.toString()), options, callback);

      Object.assign(message, { id: correlationId });
      const serializedPacket: ReadPacket & Partial<RmqRecord> =
        this.serializer.serialize(message);

      const options = serializedPacket.options;
      delete serializedPacket.options;

      this.responseEmitter.on(correlationId, listener);
      this.channel
        .sendToQueue(
          this.queue,
          Buffer.from(JSON.stringify(serializedPacket)),
          {
            replyTo: this.replyQueue,
            persistent: this.persistent,
            ...options,
            headers: this.mergeHeaders(options?.headers),
            correlationId,
          },
        )
        .catch(err => callback({ err }));
      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const serializedPacket: ReadPacket & Partial<RmqRecord> =
      this.serializer.serialize(packet);

    const options = serializedPacket.options;
    delete serializedPacket.options;

    return new Promise<void>((resolve, reject) =>
      this.channel.sendToQueue(
        this.queue,
        Buffer.from(JSON.stringify(serializedPacket)),
        {
          persistent: this.persistent,
          ...options,
          headers: this.mergeHeaders(options?.headers),
        },
        (err: unknown) => (err ? reject(err) : resolve()),
      ),
    );
  }

  protected initializeSerializer(options: RmqOptions['options']) {
    this.serializer = options?.serializer ?? new RmqRecordSerializer();
  }

  protected mergeHeaders(
    requestHeaders?: Record<string, string>,
  ): Record<string, string> | undefined {
    if (!requestHeaders && !this.options?.headers) {
      return undefined;
    }

    return {
      ...this.options?.headers,
      ...requestHeaders,
    };
  }
}
