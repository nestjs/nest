import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  ERROR_EVENT,
  MESSAGE_EVENT,
  REDIS_DEFAULT_HOST,
  REDIS_DEFAULT_PORT,
} from '../constants';
import { ReadPacket, RedisOptions, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';

type Redis = any;

let redisPackage = {} as any;

/**
 * @publicApi
 */
export class ClientRedis extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly subscriptionsCount = new Map<string, number>();
  protected pubClient: Redis;
  protected subClient: Redis;
  protected connection: Promise<any>;
  protected isExplicitlyTerminated = false;

  constructor(protected readonly options: RedisOptions['options']) {
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
    this.isExplicitlyTerminated = true;
  }

  public async connect(): Promise<any> {
    if (this.pubClient && this.subClient) {
      return this.connection;
    }
    this.pubClient = this.createClient();
    this.subClient = this.createClient();
    this.handleError(this.pubClient);
    this.handleError(this.subClient);

    this.connection = Promise.all([
      this.subClient.connect(),
      this.pubClient.connect(),
    ]);
    await this.connection;

    this.subClient.on(MESSAGE_EVENT, this.createResponseCallback());
    return this.connection;
  }

  public createClient(): Redis {
    return new redisPackage({
      host: REDIS_DEFAULT_HOST,
      port: REDIS_DEFAULT_PORT,
      ...this.getClientOptions(),
      lazyConnect: true,
    });
  }

  public handleError(client: Redis) {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
    const retryStrategy = (times: number) => this.createRetryStrategy(times);

    return {
      ...(this.options || {}),
      retryStrategy,
    };
  }

  public createRetryStrategy(times: number): undefined | number {
    if (this.isExplicitlyTerminated) {
      return undefined;
    }
    if (
      !this.getOptionsProp(this.options, 'retryAttempts') ||
      times > this.getOptionsProp(this.options, 'retryAttempts')
    ) {
      this.logger.error('Retry time exhausted');
      return;
    }
    return this.getOptionsProp(this.options, 'retryDelay') || 0;
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
    const subscriptionCount = this.subscriptionsCount.get(channel);
    this.subscriptionsCount.set(channel, subscriptionCount - 1);

    if (subscriptionCount - 1 <= 0) {
      this.subClient.unsubscribe(channel);
    }
  }
}
