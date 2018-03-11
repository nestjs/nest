import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
import {
  REDIS_DEFAULT_URL,
  MESSAGE_EVENT,
  ERROR_EVENT,
  CONNECT_EVENT,
} from './../constants';

export class ClientRedis extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private pubClient: redis.RedisClient;
  private subClient: redis.RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly metadata: ClientMetadata) {
    super();
    this.url = metadata.url || REDIS_DEFAULT_URL;
  }

  protected sendMessage(msg, callback: (...args) => any) {
    if (!this.pubClient || !this.subClient) {
      this.init(callback);
    }
    const pattern = JSON.stringify(msg.pattern);
    const responseCallback = (channel, message) => {
      const { err, response, disposed } = JSON.parse(message);

      if (disposed || err) {
        callback(err, null, true);
        this.subClient.unsubscribe(this.getResPatternName(pattern));
        this.subClient.removeListener(MESSAGE_EVENT, responseCallback);
        return;
      }
      callback(err, response);
    };
    this.subClient.on(MESSAGE_EVENT, responseCallback);
    this.subClient.subscribe(this.getResPatternName(pattern));
    this.pubClient.publish(
      this.getAckPatternName(pattern),
      JSON.stringify(msg),
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
      !this.metadata.retryAttempts ||
      options.attempt > this.metadata.retryAttempts
    ) {
      return undefined;
    }
    return this.metadata.retryDelay || 0;
  }
}
