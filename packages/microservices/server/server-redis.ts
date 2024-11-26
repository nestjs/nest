import { isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  NO_MESSAGE_HANDLER,
  REDIS_DEFAULT_HOST,
  REDIS_DEFAULT_PORT,
} from '../constants';
import { RedisContext } from '../ctx-host';
import { Transport } from '../enums';
import {
  RedisEvents,
  RedisEventsMap,
  RedisStatus,
} from '../events/redis.events';
import { IncomingRequest, RedisOptions } from '../interfaces';
import { Server } from './server';

// To enable type safety for Redis. This cant be uncommented by default
// because it would require the user to install the ioredis package even if they dont use Redis
// Otherwise, TypeScript would fail to compile the code.
//
// type Redis = import('ioredis').Redis;
type Redis = any;

let redisPackage = {} as any;

/**
 * @publicApi
 */
export class ServerRedis extends Server<RedisEvents, RedisStatus> {
  public readonly transportId = Transport.REDIS;

  protected subClient: Redis;
  protected pubClient: Redis;
  protected isManuallyClosed = false;
  protected wasInitialConnectionSuccessful = false;
  protected pendingEventListeners: Array<{
    event: keyof RedisEvents;
    callback: RedisEvents[keyof RedisEvents];
  }> = [];

  constructor(protected readonly options: Required<RedisOptions>['options']) {
    super();

    redisPackage = this.loadPackage('ioredis', ServerRedis.name, () =>
      require('ioredis'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.subClient = this.createRedisClient();
      this.pubClient = this.createRedisClient();

      [this.subClient, this.pubClient].forEach((client, index) => {
        const type = index === 0 ? 'pub' : 'sub';
        this.registerErrorListener(client);
        this.registerReconnectListener(client);
        this.registerReadyListener(client);
        this.registerEndListener(client);
        this.pendingEventListeners.forEach(({ event, callback }) =>
          client.on(event, (...args: [any]) => callback(type, ...args)),
        );
      });
      this.pendingEventListeners = [];

      this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public start(callback?: () => void) {
    void Promise.all([this.subClient.connect(), this.pubClient.connect()])
      .then(() => {
        this.bindEvents(this.subClient, this.pubClient);
        callback?.();
      })
      .catch(callback);
  }

  public bindEvents(subClient: Redis, pubClient: Redis) {
    subClient.on(
      this.options?.wildcards ? 'pmessage' : 'message',
      this.getMessageHandler(pubClient).bind(this),
    );
    const subscribePatterns = [...this.messageHandlers.keys()];
    subscribePatterns.forEach(pattern => {
      const { isEventHandler } = this.messageHandlers.get(pattern)!;

      const channel = isEventHandler
        ? pattern
        : this.getRequestPattern(pattern);

      if (this.options?.wildcards) {
        subClient.psubscribe(channel);
      } else {
        subClient.subscribe(channel);
      }
    });
  }

  public close() {
    this.isManuallyClosed = true;
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
    this.pendingEventListeners = [];
  }

  public createRedisClient(): Redis {
    return new redisPackage({
      port: REDIS_DEFAULT_PORT,
      host: REDIS_DEFAULT_HOST,
      ...this.getClientOptions(),
      lazyConnect: true,
    });
  }

  public getMessageHandler(pub: Redis) {
    return this.options?.wildcards
      ? (channel: string, pattern: string, buffer: string) =>
          this.handleMessage(channel, buffer, pub, pattern)
      : (channel: string, buffer: string) =>
          this.handleMessage(channel, buffer, pub, channel);
  }

  public async handleMessage(
    channel: string,
    buffer: string,
    pub: Redis,
    pattern: string,
  ) {
    const rawMessage = this.parseMessage(buffer);
    const packet = await this.deserializer.deserialize(rawMessage, { channel });
    const redisCtx = new RedisContext([pattern]);

    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(channel, packet, redisCtx);
    }
    const publish = this.getPublisher(
      pub,
      channel,
      (packet as IncomingRequest).id,
    );
    const handler = this.getHandlerByPattern(channel);

    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: (packet as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      };
      return publish(noHandlerPacket);
    }
    const response$ = this.transformToObservable(
      await handler(packet.data, redisCtx),
    );
    response$ && this.send(response$, publish);
  }

  public getPublisher(pub: Redis, pattern: any, id: string) {
    return (response: any) => {
      Object.assign(response, { id });
      const outgoingResponse = this.serializer.serialize(response);

      return pub.publish(
        this.getReplyPattern(pattern),
        JSON.stringify(outgoingResponse),
      );
    };
  }

  public parseMessage(content: any): Record<string, any> {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}.reply`;
  }

  public registerErrorListener(client: any) {
    client.on(RedisEventsMap.ERROR, (err: any) => this.logger.error(err));
  }

  public registerReconnectListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
    client.on(RedisEventsMap.RECONNECTING, () => {
      if (this.isManuallyClosed) {
        return;
      }
      this._status$.next(RedisStatus.RECONNECTING);

      if (this.wasInitialConnectionSuccessful) {
        this.logger.log('Reconnecting to Redis...');
      }
    });
  }

  public registerReadyListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
    client.on(RedisEventsMap.READY, () => {
      this._status$.next(RedisStatus.CONNECTED);

      this.logger.log('Connected to Redis. Subscribing to channels...');

      if (!this.wasInitialConnectionSuccessful) {
        this.wasInitialConnectionSuccessful = true;
      }
    });
  }

  public registerEndListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
    client.on('end', () => {
      if (this.isManuallyClosed) {
        return;
      }
      this._status$.next(RedisStatus.DISCONNECTED);

      this.logger.error(
        'Disconnected from Redis. No further reconnection attempts will be made.',
      );
    });
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
    const retryStrategy = (times: number) => this.createRetryStrategy(times);

    return {
      ...(this.options || {}),
      retryStrategy,
    };
  }

  public createRetryStrategy(times: number): undefined | number | void {
    if (this.isManuallyClosed) {
      return undefined;
    }
    if (!this.getOptionsProp(this.options, 'retryAttempts')) {
      this.logger.error(
        'Redis connection closed and retry attempts not specified',
      );
      return;
    }
    if (times > this.getOptionsProp(this.options, 'retryAttempts', 0)) {
      this.logger.error(`Retry time exhausted`);
      return;
    }
    return this.getOptionsProp(this.options, 'retryDelay', 5000);
  }

  public unwrap<T>(): T {
    if (!this.pubClient || !this.subClient) {
      throw new Error(
        'Not initialized. Please call the "listen"/"startAllMicroservices" method before accessing the server.',
      );
    }
    return [this.pubClient, this.subClient] as T;
  }

  public on<
    EventKey extends keyof RedisEvents = keyof RedisEvents,
    EventCallback extends RedisEvents[EventKey] = RedisEvents[EventKey],
  >(event: EventKey, callback: EventCallback) {
    if (this.subClient && this.pubClient) {
      this.subClient.on(event, (...args: [any]) => callback('sub', ...args));
      this.pubClient.on(event, (...args: [any]) => callback('pub', ...args));
    } else {
      this.pendingEventListeners.push({ event, callback });
    }
  }
}
