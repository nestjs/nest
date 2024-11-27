import {
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import {
  CONNECTION_FAILED_MESSAGE,
  DISCONNECTED_RMQ_MESSAGE,
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
  RQM_NO_EVENT_HANDLER,
  RQM_NO_MESSAGE_HANDLER,
} from '../constants';
import { RmqContext } from '../ctx-host';
import { Transport } from '../enums';
import { RmqEvents, RmqEventsMap, RmqStatus } from '../events/rmq.events';
import { RmqUrl } from '../external/rmq-url.interface';
import { RmqOptions } from '../interfaces';
import {
  IncomingRequest,
  OutgoingResponse,
  ReadPacket,
} from '../interfaces/packet.interface';
import { RmqRecordSerializer } from '../serializers/rmq-record.serializer';
import { Server } from './server';

// To enable type safety for RMQ. This cant be uncommented by default
// because it would require the user to install the amqplib package even if they dont use RabbitMQ
// Otherwise, TypeScript would fail to compile the code.
//
// type AmqpConnectionManager =
//   import('amqp-connection-manager').AmqpConnectionManager;
// type ChannelWrapper = import('amqp-connection-manager').ChannelWrapper;
// type Message = import('amqplib').Message;

type AmqpConnectionManager = any;
type ChannelWrapper = any;
type Message = any;

let rmqPackage = {} as any; // as typeof import('amqp-connection-manager');

const INFINITE_CONNECTION_ATTEMPTS = -1;

/**
 * @publicApi
 */
export class ServerRMQ extends Server<RmqEvents, RmqStatus> {
  public readonly transportId = Transport.RMQ;

  protected server: AmqpConnectionManager = null;
  protected channel: ChannelWrapper = null;
  protected connectionAttempts = 0;
  protected readonly urls: string[] | RmqUrl[];
  protected readonly queue: string;
  protected readonly noAck: boolean;
  protected readonly queueOptions: any;
  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];

  constructor(protected readonly options: Required<RmqOptions>['options']) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue =
      this.getOptionsProp(this.options, 'queue') || RQM_DEFAULT_QUEUE;
    this.noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);
    this.queueOptions =
      this.getOptionsProp(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;

    this.loadPackage('amqplib', ServerRMQ.name, () => require('amqplib'));
    rmqPackage = this.loadPackage(
      'amqp-connection-manager',
      ServerRMQ.name,
      () => require('amqp-connection-manager'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ): Promise<void> {
    try {
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public close(): void {
    this.channel && this.channel.close();
    this.server && this.server.close();
    this.pendingEventListeners = [];
  }

  public async start(
    callback?: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.server = this.createClient();
    this.server.once(RmqEventsMap.CONNECT, () => {
      if (this.channel) {
        return;
      }
      this._status$.next(RmqStatus.CONNECTED);
      this.channel = this.server.createChannel({
        json: false,
        setup: (channel: any) => this.setupChannel(channel, callback!),
      });
    });

    const maxConnectionAttempts = this.getOptionsProp(
      this.options,
      'maxConnectionAttempts',
      INFINITE_CONNECTION_ATTEMPTS,
    );

    this.registerConnectListener();
    this.registerDisconnectListener();
    this.pendingEventListeners.forEach(({ event, callback }) =>
      this.server.on(event, callback),
    );
    this.pendingEventListeners = [];

    const connectFailedEvent = 'connectFailed';
    this.server.once(connectFailedEvent, (error: Record<string, unknown>) => {
      this._status$.next(RmqStatus.DISCONNECTED);

      this.logger.error(CONNECTION_FAILED_MESSAGE);
      if (error?.err) {
        this.logger.error(error.err);
      }
      const isReconnecting = !!this.channel;
      if (
        maxConnectionAttempts === INFINITE_CONNECTION_ATTEMPTS ||
        isReconnecting
      ) {
        return;
      }
      if (++this.connectionAttempts === maxConnectionAttempts) {
        this.close();
        callback?.(error.err ?? new Error(CONNECTION_FAILED_MESSAGE));
      }
    });
  }

  public createClient<T = any>(): T {
    const socketOptions = this.getOptionsProp(this.options, 'socketOptions');
    return rmqPackage.connect(this.urls, {
      connectionOptions: socketOptions?.connectionOptions,
      heartbeatIntervalInSeconds: socketOptions?.heartbeatIntervalInSeconds,
      reconnectTimeInSeconds: socketOptions?.reconnectTimeInSeconds,
    });
  }

  private registerConnectListener() {
    this.server.on(RmqEventsMap.CONNECT, (err: any) => {
      this._status$.next(RmqStatus.CONNECTED);
    });
  }

  private registerDisconnectListener() {
    this.server.on(RmqEventsMap.DISCONNECT, (err: any) => {
      this._status$.next(RmqStatus.DISCONNECTED);
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  public async setupChannel(channel: any, callback: Function) {
    const noAssert =
      this.getOptionsProp(this.options, 'noAssert') ??
      this.queueOptions.noAssert ??
      RQM_DEFAULT_NO_ASSERT;

    if (!noAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }

    const isGlobalPrefetchCount = this.getOptionsProp(
      this.options,
      'isGlobalPrefetchCount',
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    );
    const prefetchCount = this.getOptionsProp(
      this.options,
      'prefetchCount',
      RQM_DEFAULT_PREFETCH_COUNT,
    );

    if (this.options.exchange && this.options.routingKey) {
      await channel.assertExchange(this.options.exchange, 'topic', {
        durable: true,
      });
      await channel.bindQueue(
        this.queue,
        this.options.exchange,
        this.options.routingKey,
      );
    }

    await channel.prefetch(prefetchCount, isGlobalPrefetchCount);
    channel.consume(
      this.queue,
      (msg: Record<string, any>) => this.handleMessage(msg, channel),
      {
        noAck: this.noAck,
        consumerTag: this.getOptionsProp(
          this.options,
          'consumerTag',
          undefined,
        ),
      },
    );
    callback();
  }

  public async handleMessage(
    message: Record<string, any>,
    channel: any,
  ): Promise<void> {
    if (isNil(message)) {
      return;
    }
    const { content, properties } = message;
    const rawMessage = this.parseMessageContent(content);
    const packet = await this.deserializer.deserialize(rawMessage, properties);
    const pattern = isString(packet.pattern)
      ? packet.pattern
      : JSON.stringify(packet.pattern);

    const rmqContext = new RmqContext([message, channel, pattern]);
    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(pattern, packet, rmqContext);
    }
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      if (!this.noAck) {
        this.logger.warn(RQM_NO_MESSAGE_HANDLER`${pattern}`);
        this.channel.nack(rmqContext.getMessage() as Message, false, false);
      }
      const status = 'error';
      const noHandlerPacket = {
        id: (packet as IncomingRequest).id,
        err: NO_MESSAGE_HANDLER,
        status,
      };
      return this.sendMessage(
        noHandlerPacket,
        properties.replyTo,
        properties.correlationId,
      );
    }
    const response$ = this.transformToObservable(
      await handler(packet.data, rmqContext),
    );

    const publish = <T>(data: T) =>
      this.sendMessage(data, properties.replyTo, properties.correlationId);

    response$ && this.send(response$, publish);
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: RmqContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler && !this.noAck) {
      this.channel.nack(context.getMessage() as Message, false, false);
      return this.logger.warn(RQM_NO_EVENT_HANDLER`${pattern}`);
    }
    return super.handleEvent(pattern, packet, context);
  }

  public sendMessage<T = any>(
    message: T,
    replyTo: any,
    correlationId: string,
  ): void {
    const outgoingResponse = this.serializer.serialize(
      message as unknown as OutgoingResponse,
    );
    const options = outgoingResponse.options;
    delete outgoingResponse.options;

    const buffer = Buffer.from(JSON.stringify(outgoingResponse));
    this.channel.sendToQueue(replyTo, buffer, { correlationId, ...options });
  }

  public unwrap<T>(): T {
    if (!this.server) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return this.server as T;
  }

  public on<
    EventKey extends keyof RmqEvents = keyof RmqEvents,
    EventCallback extends RmqEvents[EventKey] = RmqEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.server) {
      this.server.addListener(event, callback);
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }

  protected initializeSerializer(options: RmqOptions['options']) {
    this.serializer = options?.serializer ?? new RmqRecordSerializer();
  }

  private parseMessageContent(content: Buffer) {
    try {
      return JSON.parse(content.toString());
    } catch {
      return content.toString();
    }
  }
}
