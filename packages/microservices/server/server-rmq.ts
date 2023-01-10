import {
  isNil,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import {
  CONNECTION_FAILED_MESSAGE,
  CONNECT_EVENT,
  CONNECT_FAILED_EVENT,
  DISCONNECTED_RMQ_MESSAGE,
  DISCONNECT_EVENT,
  NO_MESSAGE_HANDLER,
  RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT,
  RQM_DEFAULT_NOACK,
  RQM_DEFAULT_NO_ASSERT,
  RQM_DEFAULT_PREFETCH_COUNT,
  RQM_DEFAULT_QUEUE,
  RQM_DEFAULT_QUEUE_OPTIONS,
  RQM_DEFAULT_URL,
} from '../constants';
import { RmqContext } from '../ctx-host';
import { Transport } from '../enums';
import { RmqUrl } from '../external/rmq-url.interface';
import { CustomTransportStrategy, RmqOptions } from '../interfaces';
import {
  IncomingRequest,
  OutgoingResponse,
} from '../interfaces/packet.interface';
import { RmqRecordSerializer } from '../serializers/rmq-record.serializer';
import { Server } from './server';

let rqmPackage: any = {};

const INFINITE_CONNECTION_ATTEMPTS = -1;

export class ServerRMQ extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.RMQ;

  protected server: any = null;
  protected channel: any = null;
  protected connectionAttempts = 0;
  protected readonly urls: string[] | RmqUrl[];
  protected readonly queue: string;
  protected readonly prefetchCount: number;
  protected readonly queueOptions: any;
  protected readonly isGlobalPrefetchCount: boolean;
  protected readonly noAssert: boolean;

  constructor(protected readonly options: RmqOptions['options']) {
    super();
    this.urls = this.getOptionsProp(this.options, 'urls') || [RQM_DEFAULT_URL];
    this.queue =
      this.getOptionsProp(this.options, 'queue') || RQM_DEFAULT_QUEUE;
    this.prefetchCount =
      this.getOptionsProp(this.options, 'prefetchCount') ||
      RQM_DEFAULT_PREFETCH_COUNT;
    this.isGlobalPrefetchCount =
      this.getOptionsProp(this.options, 'isGlobalPrefetchCount') ||
      RQM_DEFAULT_IS_GLOBAL_PREFETCH_COUNT;
    this.queueOptions =
      this.getOptionsProp(this.options, 'queueOptions') ||
      RQM_DEFAULT_QUEUE_OPTIONS;
    this.noAssert =
      this.getOptionsProp(this.options, 'noAssert') || RQM_DEFAULT_NO_ASSERT;

    this.loadPackage('amqplib', ServerRMQ.name, () => require('amqplib'));
    rqmPackage = this.loadPackage(
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
  }

  public async start(
    callback?: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    this.server = this.createClient();
    this.server.on(CONNECT_EVENT, () => {
      if (this.channel) {
        return;
      }
      this.channel = this.server.createChannel({
        json: false,
        setup: (channel: any) => this.setupChannel(channel, callback),
      });
    });

    const maxConnectionAttempts = this.getOptionsProp(
      this.options,
      'maxConnectionAttempts',
      INFINITE_CONNECTION_ATTEMPTS,
    );
    this.server.on(DISCONNECT_EVENT, (err: any) => {
      this.logger.error(DISCONNECTED_RMQ_MESSAGE);
      this.logger.error(err);
    });
    this.server.on(CONNECT_FAILED_EVENT, (error: Record<string, unknown>) => {
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
    return rqmPackage.connect(this.urls, {
      connectionOptions: socketOptions,
      heartbeatIntervalInSeconds: socketOptions?.heartbeatIntervalInSeconds,
      reconnectTimeInSeconds: socketOptions?.reconnectTimeInSeconds,
    });
  }

  public async setupChannel(channel: any, callback: Function) {
    const noAck = this.getOptionsProp(this.options, 'noAck', RQM_DEFAULT_NOACK);

    if (!this.queueOptions.noAssert) {
      await channel.assertQueue(this.queue, this.queueOptions);
    }
    await channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    channel.consume(
      this.queue,
      (msg: Record<string, any>) => this.handleMessage(msg, channel),
      {
        noAck,
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
