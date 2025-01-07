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
  DISCONNECTED_RMQ_MESSAGE,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_PERSISTENT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '../constants';
import { RmqEvents, RmqEventsMap, RmqStatus } from '../events/rmq.events';
import { ReadPacket, RmqOptions, WritePacket } from '../interfaces';
import { RmqRecord } from '../record-builders';
import { RmqRecordSerializer } from '../serializers/rmq-record.serializer';
import { ClientProxy } from './client-proxy';

// To enable type safety for RMQ. This cant be uncommented by default
// because it would require the user to install the amqplib package even if they dont use RabbitMQ
// Otherwise, TypeScript would fail to compile the code.
//
// type AmqpConnectionManager =
//   import('amqp-connection-manager').AmqpConnectionManager;
// type ChannelWrapper = import('amqp-connection-manager').ChannelWrapper;
// type Channel = import('amqplib').Channel;
// type ConsumeMessage = import('amqplib').ConsumeMessage;

type Channel = any;
type ChannelWrapper = any;
type ConsumeMessage = any;
type AmqpConnectionManager = any;

let rmqPackage = {} as any; // typeof import('amqp-connection-manager');

const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

/**
 * @publicApi
 */
export class ClientRMQ extends ClientProxy<RmqEvents, RmqStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected connection$: ReplaySubject<any>;
  protected connectionPromise: Promise<void>;
  protected client: AmqpConnectionManager = null;
  protected channel: ChannelWrapper = null;
  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];
  protected isInitialConnect = true;
  protected responseEmitter: EventEmitter;
  protected queue: string;
  protected queueOptions: Record<string, any>;
  protected replyQueue: string;
  protected noAssert: boolean;

  constructor(protected readonly options: Required<RmqOptions>['options']) {
    super();
    this.queue = this.getOptionsProp(this.options, 'queue', RQM_DEFAULT_QUEUE);
    this.queueOptions = this.getOptionsProp(
      this.options,
      'queueOptions',
      RQM_DEFAULT_QUEUE_OPTIONS,
    );
    this.replyQueue = this.getOptionsProp(
      this.options,
      'replyQueue',
      REPLY_QUEUE,
    );
    this.noAssert =
      this.getOptionsProp(this.options, 'noAssert') ??
      this.queueOptions.noAssert ??
      RQM_DEFAULT_NO_ASSERT;

    loadPackage('amqplib', ClientRMQ.name, () => require('amqplib'));
    rmqPackage = loadPackage('amqp-connection-manager', ClientRMQ.name, () =>
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
    this.pendingEventListeners = [];
  }

  public connect(): Promise<any> {
    if (this.client) {
      return this.connectionPromise;
    }
    this.client = this.createClient();

    this.registerErrorListener(this.client);
    this.registerDisconnectListener(this.client);
    this.registerConnectListener(this.client);
    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.client.on(event, callback),
    );
    this.pendingEventListeners = [];

    this.responseEmitter = new EventEmitter();
    this.responseEmitter.setMaxListeners(0);

    const connect$ = this.connect$(this.client);
    const withDisconnect$ = this.mergeDisconnectEvent(
      this.client,
      connect$,
    ).pipe(switchMap(() => this.createChannel()));

    const withReconnect$ = fromEvent(this.client, RmqEventsMap.CONNECT).pipe(
      skip(1),
    );
    const source$ = merge(withDisconnect$, withReconnect$);

    this.connection$ = new ReplaySubject(1);
    source$.subscribe(this.connection$);
    this.connectionPromise = this.convertConnectionToPromise();

    return this.connectionPromise;
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
    const urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    return rmqPackage.connect(urls, socketOptions);
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
    const disconnect$ = eventToError(RmqEventsMap.DISCONNECT);

    const urls = this.getOptionsProp(this.options, 'urls', []);
    const connectFailedEventKey = 'connectFailed';
    const connectFailed$ = eventToError(connectFailedEventKey).pipe(
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

    if (!this.noAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }

    if (this.options.exchange && this.options.routingKey) {
      await channel.bindQueue(
        this.queue,
        this.options.exchange,
        this.options.routingKey,
      );
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

  public registerErrorListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.ERROR, (err: any) =>
      this.logger.error(err),
    );
  }

  public registerDisconnectListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.DISCONNECT, (err: any) => {
      this._status$.next(RmqStatus.DISCONNECTED);

      if (!this.isInitialConnect) {
        this.connectionPromise = Promise.reject(
          'Error: Connection lost. Trying to reconnect...',
        );

        // Prevent unhandled promise rejection
        this.connectionPromise.catch(() => {});
      }

      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  private registerConnectListener(client: AmqpConnectionManager): void {
    client.addListener(RmqEventsMap.CONNECT, () => {
      this._status$.next(RmqStatus.CONNECTED);
      this.logger.log('Successfully connected to RMQ broker');

      if (this.isInitialConnect) {
        this.isInitialConnect = false;

        if (!this.channel) {
          this.connectionPromise = this.createChannel();
        }
      } else {
        this.connectionPromise = Promise.resolve();
      }
    });
  }

  public on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.client) {
      this.client.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  public unwrap<T>(): T {
    if (!this.client) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return this.client as T;
  }

  public async handleMessage(
    packet: unknown,
    callback: (packet: WritePacket) => any,
  ): Promise<void>;
  public async handleMessage(
    packet: unknown,
    options: Record<string, unknown>,
    callback: (packet: WritePacket) => any,
  ): Promise<void>;
  public async handleMessage(
    packet: unknown,
    options:
      | Record<string, unknown>
      | ((packet: WritePacket) => any)
      | undefined,
    callback?: (packet: WritePacket) => any,
  ): Promise<void> {
    if (isFunction(options)) {
      callback = options as (packet: WritePacket) => any;
      options = undefined;
    }

    const { err, response, isDisposed } = await this.deserializer.deserialize(
      packet,
      options,
    );
    if (isDisposed || err) {
      callback?.({
        err,
        response,
        isDisposed: true,
      });
    }
    callback?.({
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
        this.handleMessage(
          this.parseMessageContent(content),
          options,
          callback,
        );

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
            persistent: this.getOptionsProp(
              this.options,
              'persistent',
              RQM_DEFAULT_PERSISTENT,
            ),
            ...options,
            headers: this.mergeHeaders(options?.headers),
            correlationId,
          },
        )
        .catch(err => callback({ err }));
      return () => this.responseEmitter.removeListener(correlationId, listener);
    } catch (err) {
      callback({ err });
      return () => {};
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
          persistent: this.getOptionsProp(
            this.options,
            'persistent',
            RQM_DEFAULT_PERSISTENT,
          ),
          ...options,
          headers: this.mergeHeaders(options?.headers),
        },
        (err: unknown) => (err ? reject(err as Error) : resolve()),
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

  protected parseMessageContent(content: Buffer) {
    const rawContent = content.toString();
    try {
      return JSON.parse(rawContent);
    } catch {
      return rawContent;
    }
  }
}
