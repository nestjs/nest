import * as redis from 'redis';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
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
import { ReadPacket } from '@nestjs/microservices';

export class ServerRedis extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private subClient: redis.RedisClient;
  private pubClient: redis.RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.url = options.url || REDIS_DEFAULT_URL;
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
    const registeredPatterns = Object.keys(this.messageHandlers);
    registeredPatterns.forEach(pattern =>
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

  public getMessageHandler(pub: redis.RedisClient) {
    return async (channel, buffer) =>
      await this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(
    channel,
    buffer: string | any,
    pub: redis.RedisClient,
  ) {
    const packet = this.serialize(buffer);
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern, packet.id);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return publish({ id: packet.id, status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(packet.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(pub: redis.RedisClient, pattern: any, id: string) {
    return response =>
      pub.publish(
        this.getResQueueName(pattern, id),
        JSON.stringify(Object.assign(response, { id })),
      );
  }

  public serialize(content): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
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
      !this.options.retryAttempts ||
      options.attempt > this.options.retryAttempts
    ) {
      return undefined;
    }
    return this.options.retryDelay || 0;
  }
}
