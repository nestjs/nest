/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import {
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import {
  CONNECTION_FAILED_MESSAGE,
  DISCONNECTED_RMQ_MESSAGE,
  NO_MESSAGE_HANDLER,
  RMQ_SEPARATOR,
  RMQ_WILDCARD_ALL,
  RMQ_WILDCARD_SINGLE,
  RMQ_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RMQ_DEFAULT_NOACK,
  RMQ_DEFAULT_NO_ASSERT,
  RMQ_DEFAULT_PREFETCH_COUNT,
  RMQ_DEFAULT_QUEUE,
  RMQ_DEFAULT_QUEUE_OPTIONS,
  RMQ_DEFAULT_URL,
  RMQ_NO_EVENT_HANDLER,
  RMQ_NO_MESSAGE_HANDLER,
} from '../constants';
import { RmqContext } from '../ctx-host';
import { Transport } from '../enums';
import { RmqEvents, RmqEventsMap, RmqStatus } from '../events/rmq.events';
import { RmqUrl } from '../external/rmq-url.interface';
import { MessageHandler, RmqOptions, TransportId } from '../interfaces';
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
// type Channel = import('amqplib').Channel | import('amqplib').ConfirmChannel;

type AmqpConnectionManager = any;
type ChannelWrapper = any;
type Message = any;
type Channel = any;

let rmqPackage = {} as any; // as typeof import('amqp-connection-manager');

const INFINITE_CONNECTION_ATTEMPTS = -1;

/**
 * @publicApi
 */
export class ServerRMQ extends Server<RmqEvents, RmqStatus> {
  public transportId: TransportId = Transport.RMQ;

  protected server: AmqpConnectionManager | null = null;
  protected channel: ChannelWrapper | null = null;
  protected connectionAttempts = 0;
  protected readonly urls: string[] | RmqUrl[];
  protected readonly queue: string;
  protected readonly noAck: boolean;
  protected readonly queueOptions: any;
  protected readonly wildcardHandlers = new Map<string, MessageHandler>();
  protected pendingEventListeners: Array<{
    event: keyof RmqEvents;
    callback: RmqEvents[keyof RmqEvents];
  }> = [];

  constructor(protected readonly options: Required<RmqOptions>['options']) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RMQ_DEFAULT_URL];
    this.queue =
      this.getOptionsProp(this.options, 'queue') || RMQ_DEFAULT_QUEUE;
    this.noAck = this.getOptionsProp(this.options, 'noAck', RMQ_DEFAULT_NOACK);
    this.queueOptions =
      this.getOptionsProp(this.options, 'queueOptions') ||
      RMQ_DEFAULT_QUEUE_OPTIONS;

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

  public async close(): Promise<void> {
    this.channel && (await this.channel.close());
    this.server && (await this.server.close());
    this.pendingEventListeners = [];
  }

  public async start(
    callback?: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.server = this.createClient();
    this.server!.once(RmqEventsMap.CONNECT, () => {
      if (this.channel) {
        return;
      }
      this._status$.next(RmqStatus.CONNECTED);
      this.channel = this.server!.createChannel({
        json: false,
        setup: (channel: Channel) => this.setupChannel(channel, callback!),
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
      this.server!.on(event, callback),
    );
    this.pendingEventListeners = [];

    const connectFailedEvent = 'connectFailed';
    this.server!.once(
      connectFailedEvent,
      async (error: Record<string, unknown>) => {
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
          await this.close();
          callback?.(error.err ?? new Error(CONNECTION_FAILED_MESSAGE));
        }
      },
    );
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
    this.server!.on(RmqEventsMap.CONNECT, (err: any) => {
      this._status$.next(RmqStatus.CONNECTED);
    });
  }

  private registerDisconnectListener() {
    this.server!.on(RmqEventsMap.DISCONNECT, (err: any) => {
      this._status$.next(RmqStatus.DISCONNECTED);
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
  }

  public async setupChannel(channel: Channel, callback: Function) {
    const noAssert =
      this.getOptionsProp(this.options, 'noAssert') ??
      this.queueOptions.noAssert ??
      RMQ_DEFAULT_NO_ASSERT;

    if (!noAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }

    const isGlobalPrefetchCount = this.getOptionsProp(
      this.options,
      'isGlobalPrefetchCount',
      RMQ_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
    );
    const prefetchCount = this.getOptionsProp(
      this.options,
      'prefetchCount',
      RMQ_DEFAULT_PREFETCH_COUNT,
    );

    if (this.options.exchange || this.options.wildcards) {
      // Use queue name as exchange name if exchange is not provided and "wildcards" is set to true
      const exchange = this.getOptionsProp(
        this.options,
        'exchange',
        this.options.queue,
      );
      const exchangeType = this.getOptionsProp(
        this.options,
        'exchangeType',
        'topic',
      );
      await channel.assertExchange(exchange, exchangeType, {
        durable: true,
        arguments: this.getOptionsProp(this.options, 'exchangeArguments', {}),
      });

      if (this.options.routingKey) {
        await channel.bindQueue(this.queue, exchange, this.options.routingKey);
      }

      if (this.options.wildcards) {
        const routingKeys = Array.from(this.getHandlers().keys());
        await Promise.all(
          routingKeys.map(routingKey =>
            channel.bindQueue(this.queue, exchange, routingKey),
          ),
        );

        // When "wildcards" is set to true,  we need to initialize wildcard handlers
        // otherwise we would not be able to associate the incoming messages with the handlers
        this.initializeWildcardHandlersIfExist();
      }
    }

    await channel.prefetch(prefetchCount, isGlobalPrefetchCount);
    channel.consume(
      this.queue,
      (msg: Record<string, any> | null) => this.handleMessage(msg!, channel),
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
        this.logger.warn(RMQ_NO_MESSAGE_HANDLER`${pattern}`);
        this.channel!.nack(rmqContext.getMessage() as Message, false, false);
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
        rmqContext,
      );
    }
    return this.onProcessingStartHook(
      this.transportId,
      rmqContext,
      async () => {
        const response$ = this.transformToObservable(
          await handler(packet.data, rmqContext),
        );

        const publish = <T>(data: T) =>
          this.sendMessage(
            data,
            properties.replyTo,
            properties.correlationId,
            rmqContext,
          );

        response$ && this.send(response$, publish);
      },
    );
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: RmqContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler && !this.noAck) {
      this.channel!.nack(context.getMessage() as Message, false, false);
      return this.logger.warn(RMQ_NO_EVENT_HANDLER`${pattern}`);
    }
    return super.handleEvent(pattern, packet, context);
  }

  public sendMessage<T = any>(
    message: T,
    replyTo: any,
    correlationId: string,
    context: RmqContext,
  ): void {
    const outgoingResponse = this.serializer.serialize(
      message as unknown as OutgoingResponse,
    );
    const options = outgoingResponse.options;
    delete outgoingResponse.options;

    const buffer = Buffer.from(JSON.stringify(outgoingResponse));
    const sendOptions = { correlationId, ...options };

    this.onProcessingEndHook?.(this.transportId, context);
    this.channel!.sendToQueue(replyTo, buffer, sendOptions);
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

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    if (!this.options.wildcards) {
      return super.getHandlerByPattern(pattern);
    }

    // Search for non-wildcard handler first
    const handler = super.getHandlerByPattern(pattern);
    if (handler) {
      return handler;
    }

    // Search for wildcard handler
    if (this.wildcardHandlers.size === 0) {
      return null;
    }
    for (const [wildcardPattern, handler] of this.wildcardHandlers) {
      if (this.matchRmqPattern(wildcardPattern, pattern)) {
        return handler;
      }
    }
    return null;
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

  private initializeWildcardHandlersIfExist() {
    if (this.wildcardHandlers.size !== 0) {
      return;
    }
    const handlers = this.getHandlers();

    handlers.forEach((handler, pattern) => {
      if (
        pattern.includes(RMQ_WILDCARD_ALL) ||
        pattern.includes(RMQ_WILDCARD_SINGLE)
      ) {
        this.wildcardHandlers.set(pattern, handler);
      }
    });
  }

  private matchRmqPattern(pattern: string, routingKey: string): boolean {
    if (!routingKey) {
      return pattern === RMQ_WILDCARD_ALL;
    }

    const patternSegments = pattern.split(RMQ_SEPARATOR);
    const routingKeySegments = routingKey.split(RMQ_SEPARATOR);

    const patternSegmentsLength = patternSegments.length;
    const routingKeySegmentsLength = routingKeySegments.length;
    const lastIndex = patternSegmentsLength - 1;

    for (const [i, currentPattern] of patternSegments.entries()) {
      const currentRoutingKey = routingKeySegments[i];

      if (!currentRoutingKey && !currentPattern) {
        continue;
      }
      if (!currentRoutingKey && currentPattern !== RMQ_WILDCARD_ALL) {
        return false;
      }
      if (currentPattern === RMQ_WILDCARD_ALL) {
        return i === lastIndex;
      }
      if (
        currentPattern !== RMQ_WILDCARD_SINGLE &&
        currentPattern !== currentRoutingKey
      ) {
        return false;
      }
    }
    return patternSegmentsLength === routingKeySegmentsLength;
  }
}
