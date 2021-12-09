import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { createClient } from 'redis';
import { ERROR_EVENT, REDIS_DEFAULT_URL } from '../constants';
import { ClientOpts, RetryStrategyOptions } from '../external/redis.interface';
import { ReadPacket, RedisOptions, WritePacket } from '../interfaces';
import { ClientProxy } from './client-proxy';

let redisPackage: any = {};

export class ClientRedis extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected pubClient: ReturnType<typeof createClient>;
  protected subClient: ReturnType<typeof createClient>;
  protected connection: Promise<any>;
  protected isExplicitlyTerminated = false;

  constructor(protected readonly options: RedisOptions['options']) {
    super();
    this.url =
      this.getOptionsProp(options, 'url') ||
      (!this.getOptionsProp(options, 'host') && REDIS_DEFAULT_URL);

    redisPackage = loadPackage('redis', ClientRedis.name, () =>
      require('redis'),
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
      this.subClient.connect?.(),
      this.pubClient.connect?.(),
    ]);
    await this.connection;

    await Promise.all([this.subClient.ping?.(), this.pubClient.ping?.()]);
    return this.connection;
  }

  public createClient() {
    return redisPackage.createClient({
      ...this.getClientOptions(),
      url: this.url,
    });
  }

  public handleError(client) {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public getClientOptions(): Partial<ClientOpts> {
    const retry_strategy = (options: RetryStrategyOptions) =>
      this.createRetryStrategy(options);

    return {
      ...(this.options || {}),
      retry_strategy,
    };
  }

  public createRetryStrategy(
    options: RetryStrategyOptions,
  ): undefined | number | Error {
    if (this.isExplicitlyTerminated) {
      return undefined;
    }
    if (
      !this.getOptionsProp(this.options, 'retryAttempts') ||
      options.attempt > this.getOptionsProp(this.options, 'retryAttempts')
    ) {
      return new Error('Retry time exhausted');
    }
    return this.getOptionsProp(this.options, 'retryDelay') || 0;
  }

  public createResponseCallback(
    callback: (packet: WritePacket) => any,
  ): (buffer: string, channel: string) => Promise<void> {
    return async (buffer: string, channel: string) => {
      const packet = JSON.parse(buffer);
      const { err, response, isDisposed } = await this.deserializer.deserialize(
        packet,
      );

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
      const listener = this.createResponseCallback(callback);

      this.subClient
        .subscribe(responseChannel, listener)
        .then(() =>
          this.pubClient.publish(
            this.getRequestPattern(pattern),
            JSON.stringify(serializedPacket),
          ),
        )
        .catch(err => callback({ err }));

      return () => {
        this.subClient.unsubscribe(responseChannel, listener);
      };
    } catch (err) {
      callback({ err });
    }
  }

  protected dispatchEvent(packet: ReadPacket): Promise<any> {
    const pattern = this.normalizePattern(packet.pattern);
    const serializedPacket = this.serializer.serialize(packet);

    return this.pubClient.publish(pattern, JSON.stringify(serializedPacket));
  }
}
