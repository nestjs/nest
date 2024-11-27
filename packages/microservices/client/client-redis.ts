import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { REDIS_DEFAULT_HOST, REDIS_DEFAULT_PORT } from '../constants';
import {
  RedisEvents,
  RedisEventsMap,
  RedisStatus,
} from '../events/redis.events';
import { ReadPacket, RedisOptions, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';

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
export class ClientRedis extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected pubClient: Redis;
  protected subClient: Redis;
  protected connectionPromise: Promise<any>;
  protected isManuallyClosed = false;
  protected wasInitialConnectionSuccessful = false;
  protected pendingEventListeners: Array<{
    event: keyof RedisEvents;
    callback: RedisEvents[keyof RedisEvents];
  }> = [];

  constructor(protected readonly options: Required<RedisOptions>['options']) {
    super();

    redisPackage = loadPackage('ioredis', ClientRedis.name, () =>
      require('ioredis'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}.reply`;
  }

  public close() {
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
    this.pubClient = this.subClient = null;
    this.isManuallyClosed = true;
    this.pendingEventListeners = [];
  }

  public async connect(): Promise<any> {
    if (this.pubClient && this.subClient) {
      return this.connectionPromise;
    }
    this.pubClient = this.createClient();
    this.subClient = this.createClient();

    [this.pubClient, this.subClient].forEach((client, index) => {
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

    this.connectionPromise = Promise.all([
      this.subClient.connect(),
      this.pubClient.connect(),
    ]);
    await this.connectionPromise;
    return this.connectionPromise;
  }

  public createClient(): Redis {
    return new redisPackage({
      host: REDIS_DEFAULT_HOST,
      port: REDIS_DEFAULT_PORT,
      ...this.getClientOptions(),
      lazyConnect: true,
    });
  }

  public registerErrorListener(client: Redis) {
    client.addListener(RedisEventsMap.ERROR, (err: any) =>
      this.logger.error(err),
    );
  }

  public registerReconnectListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
    client.on(RedisEventsMap.RECONNECTING, () => {
      if (this.isManuallyClosed) {
        return;
      }

      this.connectionPromise = Promise.reject(
        'Error: Connection lost. Trying to reconnect...',
      );

      // Prevent unhandled rejections
      this.connectionPromise.catch(() => {});

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
      this.connectionPromise = Promise.resolve();
      this._status$.next(RedisStatus.CONNECTED);

      this.logger.log('Connected to Redis. Subscribing to channels...');

      if (!this.wasInitialConnectionSuccessful) {
        this.wasInitialConnectionSuccessful = true;
        this.subClient.on('message', this.createResponseCallback());
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

      if (this.getOptionsProp(this.options, 'retryAttempts') === undefined) {
        // When retryAttempts is not specified, the connection will not be re-established
        this.logger.error('Disconnected from Redis.');

        // Clean up client instances and just recreate them when connect is called
        this.pubClient = this.subClient = null;
      } else {
        this.logger.error('Disconnected from Redis.');
        this.connectionPromise = Promise.reject(
          'Error: Connection lost. Trying to reconnect...',
        );

        // Prevent unhandled rejections
        this.connectionPromise.catch(() => {});
      }
    });
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
    const retryStrategy = (times: number) => this.createRetryStrategy(times);

    return {
      ...(this.options || {}),
      retryStrategy,
    };
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

  public unwrap<T>(): T {
    if (!this.pubClient || !this.subClient) {
      throw new Error(
        'Not initialized. Please call the "connect" method first.',
      );
    }
    return [this.pubClient, this.subClient] as T;
  }

  public createRetryStrategy(times: number): undefined | number {
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
      this.logger.error('Retry time exhausted');
      return;
    }
    return this.getOptionsProp(this.options, 'retryDelay', 5000);
  }

  public createResponseCallback(): (
    channel: string,
    buffer: string,
  ) => Promise<void> {
    return async (channel: string, buffer: string) => {
      const packet = JSON.parse(buffer);
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(packet);

      const callback = this.routingMap.get(id);
      if (!callback) {
        return;
      }
      if (isDisposed || err) {
        return callback({
          err,
          response,
          isDisposed: true,
        });
      }
      callback({
        err,
        response,
      });
    };
  }

  protected publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ): () => void {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);
      const responseChannel = this.getReplyPattern(pattern);
      let subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;

      const publishPacket = () => {
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);
        this.pubClient.publish(
          this.getRequestPattern(pattern),
          JSON.stringify(serializedPacket),
        );
      };

      if (subscriptionsCount <= 0) {
        this.subClient.subscribe(
          responseChannel,
          (err: any) => !err && publishPacket(),
        );
      } else {
        publishPacket();
      }

      return () => {
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
      return () => {};
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize(packet);

    return new Promise<void>((resolve, reject) =>
      this.pubClient.publish(pattern, JSON.stringify(serializedPacket), err =>
        err ? reject(err) : resolve(),
      ),
    );
  }

  protected unsubscribeFromChannel(channel: string) {
    const subscriptionCount = this.subscriptionsCount.get(channel)!;
    this.subscriptionsCount.set(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.subClient.unsubscribe(channel);
    }
  }
}
