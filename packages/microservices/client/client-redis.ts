import { REDIS_DEFAULT_HOST, REDIS_DEFAULT_PORT } from '../constants.js';
import {
  RedisEvents,
  RedisEventsMap,
  RedisStatus,
} from '../events/redis.events.js';
import { ReadPacket, RedisOptions, WritePacket } from '../interfaces/index.js';
import { ClientProxy } from './client-proxy.js';
import { Logger } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/internal';

// To enable type safety for Redis. This cant be uncommented by default
// because it would require the user to install the ioredis package even if they dont use Redis
// Otherwise, TypeScript would fail to compile the code.
//
// type Redis = import('ioredis').Redis;
type Redis = any;

type RedisOutputOptions = {
  returnBuffers?: boolean;
};
/**
 * @publicApi
 */
export class ClientRedis extends ClientProxy<RedisEvents, RedisStatus> {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected pubClient: Redis;
  protected subClient: Redis;
  protected connectionPromise: Promise<any> | null = null;
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
    this.connectionPromise = null;
    this.isManuallyClosed = false;
    this.wasInitialConnectionSuccessful = false;
    this.pendingEventListeners = [];
  }

  public connect(): Promise<any> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    const connectionPromise = this.handleConnection().catch(err => {
      // Once the clients are connecting, the "reconnecting", "ready" and "end"
      // listeners take over `connectionPromise`: ioredis keeps retrying in
      // the background, and "end" resets the state once it gives up. If none
      // of them did, nothing else is going to reset it, so do it here to let
      // the next `connect()` call try again.
      if (this.connectionPromise === connectionPromise) {
        this.discardClients();
      }
      throw err;
    });
    this.connectionPromise = connectionPromise;
    return connectionPromise;
  }

  /**
   * Drops the current pub/sub pair, so the next `connect()` call starts over
   * with new clients. Events the dropped clients emit from now on are ignored.
   */
  private discardClients() {
    const clients = [this.pubClient, this.subClient];
    this.pubClient = this.subClient = null;
    this.connectionPromise = null;
    this.wasInitialConnectionSuccessful = false;

    for (const client of clients) {
      // An ended client has no connection or pending retry left to stop
      if (client && client.status !== 'end') {
        client.disconnect();
      }
    }
  }

  /**
   * Whether `client` belongs to the current pub/sub pair, as opposed to a
   * client that has been dropped and is still shutting down.
   */
  private isCurrentClient(client: unknown): boolean {
    return client === this.pubClient || client === this.subClient;
  }

  private async handleConnection(): Promise<any> {
    this.pubClient = await this.createClient();
    this.subClient = await this.createClient();

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

    await Promise.all([this.subClient.connect(), this.pubClient.connect()]);
  }

  public async createClient(): Promise<Redis> {
    const clientInfoTag = this.getOptionsProp(this.options, 'clientInfoTag');
    const redisPackage = await loadPackage(
      'ioredis',
      ClientRedis.name,
      () => import('ioredis'),
    );
    const RedisClient = redisPackage.default || redisPackage;
    return new RedisClient({
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
      if (this.isManuallyClosed || !this.isCurrentClient(client)) {
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
      if (!this.isCurrentClient(client)) {
        return;
      }
      this.connectionPromise = Promise.resolve();
      this._status$.next(RedisStatus.CONNECTED);

      this.logger.log('Connected to Redis. Subscribing to channels...');

      if (!this.wasInitialConnectionSuccessful) {
        this.wasInitialConnectionSuccessful = true;
        this.subClient.on(
          this.options.returnBuffers ? 'messageBuffer' : 'message',
          this.createResponseCallback(),
        );
      }
    });
  }

  public registerEndListener(client: {
    on: (event: string, fn: () => void) => void;
  }) {
    client.on('end', () => {
      if (this.isManuallyClosed || !this.isCurrentClient(client)) {
        return;
      }
      this._status$.next(RedisStatus.DISCONNECTED);
      this.handleClose();
      this.logger.error('Disconnected from Redis.');

      // ioredis gave up on this client (retry attempts not specified or
      // exhausted), so drop the pair and let the next `connect()` call
      // create a new one
      this.discardClients();
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
    // Kept until `close()`, so the pairs created later get it as well
    this.pendingEventListeners.push({ event, callback });
    if (this.subClient && this.pubClient) {
      this.subClient.on(event, (...args: [any]) => callback('sub', ...args));
      this.pubClient.on(event, (...args: [any]) => callback('pub', ...args));
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
        this.logger.debug(
          'No matching callback found for Redis response packet with id: ' + id,
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
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const serializedPacket = this.serializer.serialize(packet);
      const responseChannel = this.getReplyPattern(pattern);
      let subscriptionsCount =
        this.subscriptionsCount.get(responseChannel) || 0;
      let isPublished = false;
      let isTornDown = false;

      const undoBookkeeping = () => {
        isTornDown = true;
        isPublished = false;
        this.subscriptionsCount.set(
          responseChannel,
          (this.subscriptionsCount.get(responseChannel) || 1) - 1,
        );
        this.routingMap.delete(packet.id);
      };

      const publishPacket = () => {
        if (isTornDown) {
          return;
        }
        subscriptionsCount = this.subscriptionsCount.get(responseChannel) || 0;
        this.subscriptionsCount.set(responseChannel, subscriptionsCount + 1);
        this.routingMap.set(packet.id, callback);
        isPublished = true;

        try {
          this.pubClient.publish(
            this.getRequestPattern(pattern),
            JSON.stringify(serializedPacket),
          );
        } catch (err) {
          // The broker can acknowledge the subscription later, so this runs
          // outside the outer catch and has to undo its own work. Only the
          // bookkeeping though: a concurrent request on this pattern may still
          // be waiting for its own subscribe reply, so the broker subscription
          // is left to self-heal, as in #17671.
          undoBookkeeping();
          callback({ err });
        }
      };

      const cleanup = () => {
        isTornDown = true;
        if (!isPublished) {
          return;
        }
        isPublished = false;
        this.unsubscribeFromChannel(responseChannel);
        this.routingMap.delete(packet.id);
      };

      if (subscriptionsCount <= 0) {
        this.subClient.subscribe(responseChannel, (err: any) =>
          err ? callback({ err }) : publishPacket(),
        );
      } else {
        publishPacket();
      }

      return cleanup;
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
