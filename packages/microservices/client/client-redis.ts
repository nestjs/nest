import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isNumber, isString } from '@nestjs/common/utils/shared.utils';
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

type RedisOutputOptions = {
  returnBuffers?: boolean;
};

let redisPackage = {} as any;

/**
 * @publicApi
 */
export class ClientRedis extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  // The reply channels whose subscription Redis has not acknowledged yet
  protected readonly pendingSubscriptions = new Set<string>();
  protected pubClient: Redis;
  protected subClient: Redis;
  protected connectionPromise: Promise<any>;
  protected isManuallyClosed = false;
  protected wasInitialConnectionSuccessful = false;
  protected pendingEventListeners: Array<{
    event: keyof RedisEvents;
    callback: RedisEvents[keyof RedisEvents];
  }> = [];

  constructor(
    protected readonly options: Required<RedisOptions>['options'] &
      RedisOutputOptions,
  ) {
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

  public async close() {
    this.isManuallyClosed = true;
    this.handleClose();
    this.pubClient && (await this.pubClient.quit());
    this.subClient && (await this.subClient.quit());
    this.pubClient = this.subClient = null;
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
    const clientInfoTag = this.getOptionsProp(this.options, 'clientInfoTag');
    return new redisPackage({
      host: REDIS_DEFAULT_HOST,
      port: REDIS_DEFAULT_PORT,
      ...this.getClientOptions(),
      ...(clientInfoTag && { clientInfoTag }),
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
        const handleResponse = this.createResponseCallback();
        this.subClient.on(
          this.options.returnBuffers ? 'messageBuffer' : 'message',
          // ioredis does not handle the promise, so a rejection would crash
          // the process
          (channel: string, buffer: string) =>
            handleResponse(channel, buffer).catch(err =>
              this.logger.error(err),
            ),
        );
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
      this.handleClose();

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

  public handleClose() {
    if (this.routingMap.size > 0) {
      const err = new Error('Connection closed');
      for (const callback of this.routingMap.values()) {
        callback({ err });
      }
      this.routingMap.clear();
    }
    this.subscriptionsCount.clear();
    this.pendingSubscriptions.clear();
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
      let packet: any;
      try {
        packet = JSON.parse(buffer);
      } catch (err) {
        this.logger.debug(
          'Redis response packet is not in json format, bypassing...',
        );
        packet = buffer;
      }
      const { err, response, isDisposed, id } =
        await this.deserializer.deserialize(packet);

      const callback = this.routingMap.get(id);
      if (!callback) {
        if (Buffer.isBuffer(buffer))
          this.logger.debug(
            'You have to parse your buffer on your own to get id from it, because it is not in json format',
          );
        // Whoever can publish on the reply channel chooses the id. Request
        // ids are strings, and an object can throw when converted to one
        // (`{"toString":1}`), so only a string or a number is printed.
        const printableId =
          isString(id) || isNumber(id) ? id : `(${typeof id})`;
        this.logger.debug(
          `No matching callback found for Redis response packet with id: ${printableId}`,
        );
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
    let undoBookkeeping = () => {};
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);
      const responseChannel = this.getReplyPattern(pattern);

      // Counted right away rather than once published, as in ClientMqtt: a
      // request that waits for Redis to acknowledge the subscription depends
      // on it as well. Torn down meanwhile, it gives the subscription up, and
      // a concurrent request that finishes first does not unsubscribe.
      const subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;
      this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
      let isCounted = true;

      undoBookkeeping = () => {
        if (!isCounted) {
          return;
        }
        isCounted = false;
        this.setSubscriptionsCount(
          responseChannel,
          (this.subscriptionsCount.get(responseChannel) || 1) - 1,
        );
        this.routingMap.delete(packet.id);
      };

      const publishPacket = () => {
        if (!isCounted) {
          return;
        }
        this.routingMap.set(packet.id, callback);
        this.pubClient.publish(
          this.getRequestPattern(pattern),
          JSON.stringify(serializedPacket),
        );
      };

      // Requests are published on another connection than the one that
      // subscribes, so a request that finds the channel still waiting for its
      // acknowledgement subscribes as well rather than publishing right away,
      // which the reply could overtake.
      if (
        subscriptionsCount <= 0 ||
        this.pendingSubscriptions.has(responseChannel)
      ) {
        this.pendingSubscriptions.add(responseChannel);
        this.subClient.subscribe(responseChannel, (err: any) => {
          if (err || !isCounted) {
            // Torn down meanwhile, which gave the subscription up
            return;
          }
          this.pendingSubscriptions.delete(responseChannel);
          publishPacket();
        });
      } else {
        publishPacket();
      }

      return () => {
        if (!isCounted) {
          return;
        }
        isCounted = false;
        // Sent on the connection that subscribes, so after the SUBSCRIBE of
        // a request that is torn down before its acknowledgement
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      undoBookkeeping();
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
    this.setSubscriptionsCount(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.subClient.unsubscribe(channel);
    }
  }

  private setSubscriptionsCount(channel: string, count: number) {
    this.subscriptionsCount.set(channel, count);
    if (count <= 0) {
      this.pendingSubscriptions.delete(channel);
    }
  }
}
