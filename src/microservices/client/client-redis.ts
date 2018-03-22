import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import {
  REDIS_DEFAULT_URL,
  MESSAGE_EVENT,
  ERROR_EVENT,
  CONNECT_EVENT,
  SUBSCRIBE,
} from './../constants';
import {
  WritePacket,
  RedisOptions,
  ReadPacket,
  PacketId,
} from './../interfaces';

export class ClientRedis extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private pubClient: redis.RedisClient;
  private subClient: redis.RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<RedisOptions>(options, 'url') || REDIS_DEFAULT_URL;
  }

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    if (!this.pubClient || !this.subClient) {
      this.init(callback);
    }
    const packet = this.assignPacketId(partialPacket);
    const pattern = JSON.stringify(partialPacket.pattern);
    const responseChannel = this.getResPatternName(pattern);
    const responseCallback = (channel: string, buffer: string) => {
      const { err, response, isDisposed, id } = JSON.parse(
        buffer,
      ) as WritePacket & PacketId;
      if (id !== packet.id) {
        return void 0;
      }
      if (isDisposed || err) {
        callback({
          err,
          response: null,
          isDisposed: true,
        });
        this.subClient.unsubscribe(channel);
        this.subClient.removeListener(MESSAGE_EVENT, responseCallback);
        return;
      }
      callback({
        err,
        response,
      });
    };
    this.subClient.on(MESSAGE_EVENT, responseCallback);
    this.subClient.subscribe(responseChannel);
    await new Promise(resolve => {
      const handler = channel => {
        if (channel && channel !== responseChannel) {
          return void 0;
        }
        this.subClient.removeListener(SUBSCRIBE, handler);
        resolve();
      };
      this.subClient.on(SUBSCRIBE, handler);
    });

    this.pubClient.publish(
      this.getAckPatternName(pattern),
      JSON.stringify(packet),
    );
    return responseCallback;
  }

  public getAckPatternName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResPatternName(pattern: string): string {
    return `${pattern}_res`;
  }

  public close() {
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
    this.pubClient = this.subClient = null;
  }

  public init(callback: (...args) => any) {
    this.pubClient = this.createClient();
    this.subClient = this.createClient();

    this.handleError(this.pubClient, callback);
    this.handleError(this.subClient, callback);
  }

  public createClient(): redis.RedisClient {
    return redis.createClient({ ...this.getClientOptions(), url: this.url });
  }

  public handleError(client: redis.RedisClient, callback: (...args) => any) {
    const errorCallback = err => {
      if (err.code === 'ECONNREFUSED') {
        callback(err, null);
        this.pubClient = this.subClient = null;
      }
      this.logger.error(err);
    };
    client.addListener(ERROR_EVENT, errorCallback);
    client.on(CONNECT_EVENT, () => {
      client.removeListener(ERROR_EVENT, errorCallback);
      client.addListener(ERROR_EVENT, err => this.logger.error(err));
    });
  }

  public getClientOptions(): Partial<redis.ClientOpts> {
    const retry_strategy = options => this.createRetryStrategy(options);
    return {
      retry_strategy,
    };
  }

  public createRetryStrategy(
    options: redis.RetryStrategyOptions,
  ): undefined | number {
    if (
      this.isExplicitlyTerminated ||
      !this.getOptionsProp<RedisOptions>(this.options, 'retryAttempts') ||
      options.attempt >
        this.getOptionsProp<RedisOptions>(this.options, 'retryAttempts')
    ) {
      return undefined;
    }
    return this.getOptionsProp(this.options, 'retryDelay') || 0;
  }
}
