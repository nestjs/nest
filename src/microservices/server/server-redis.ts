import * as redis from 'redis';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { empty } from 'rxjs/observable/empty';
import { finalize } from 'rxjs/operators';
import {
  REDIS_DEFAULT_URL,
  CONNECT_EVENT,
  MESSAGE_EVENT,
  ERROR_EVENT,
} from './../constants';

export class ServerRedis extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private subClient: redis.RedisClient;
  private pubClient: redis.RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly config: MicroserviceConfiguration) {
    super();
    this.url = config.url || REDIS_DEFAULT_URL;
  }

  public listen(callback: () => void) {
    this.subClient = this.createRedisClient();
    this.pubClient = this.createRedisClient();

    this.handleError(this.pubClient);
    this.handleError(this.subClient);
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.bindEvents(this.subClient, this.pubClient);
    this.subClient.on(CONNECT_EVENT, callback);
  }

  public bindEvents(
    subClient: redis.RedisClient,
    pubClient: redis.RedisClient,
  ) {
    subClient.on(MESSAGE_EVENT, this.getMessageHandler(pubClient).bind(this));
    const patterns = Object.keys(this.messageHandlers);
    patterns.forEach(pattern =>
      subClient.subscribe(this.getAckQueueName(pattern)),
    );
  }

  public close() {
    this.isExplicitlyTerminated = true;
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
  }

  public createRedisClient(): redis.RedisClient {
    return redis.createClient({ ...this.getClientOptions(), url: this.url });
  }

  public getMessageHandler(pub) {
    return async (channel, buffer) =>
      await this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(channel, buffer, pub) {
    const msg = this.tryParse(buffer);
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return publish({ status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(msg.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(pub, pattern) {
    return respond =>
      pub.publish(this.getResQueueName(pattern), JSON.stringify(respond));
  }

  public tryParse(content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern): string {
    return `${pattern}_res`;
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
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
      !this.config.retryAttempts ||
      options.attempt > this.config.retryAttempts
    ) {
      return undefined;
    }
    return this.config.retryDelay || 0;
  }
}
