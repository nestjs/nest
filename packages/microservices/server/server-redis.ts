import { Observable } from 'rxjs';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_PATTERN_MESSAGE,
  REDIS_DEFAULT_URL,
} from '../constants';
import {
  ClientOpts,
  RedisClient,
  RetryStrategyOptions,
} from '../external/redis.interface';
import { CustomTransportStrategy, PacketId, ReadPacket } from '../interfaces';
import {
  MicroserviceOptions,
  RedisOptions,
} from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let redisPackage: any = {};

export class ServerRedis extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private subClient: RedisClient;
  private pubClient: RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly options: MicroserviceOptions['options']) {
    super();
    this.url =
      this.getOptionsProp<RedisOptions>(this.options, 'url') ||
      REDIS_DEFAULT_URL;

    redisPackage = this.loadPackage('redis', ServerRedis.name);
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

  public bindEvents(subClient: RedisClient, pubClient: RedisClient) {
    subClient.on(MESSAGE_EVENT, this.getMessageHandler(pubClient).bind(this));
    const subscribePatterns = Object.keys(this.messageHandlers);
    subscribePatterns.forEach(pattern =>
      subClient.subscribe(this.getAckQueueName(pattern)),
    );
  }

  public close() {
    this.isExplicitlyTerminated = true;
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
  }

  public createRedisClient(): RedisClient {
    return redisPackage.createClient({
      ...this.getClientOptions(),
      url: this.url,
    });
  }

  public getMessageHandler(pub: RedisClient) {
    return async (channel, buffer) => this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(channel, buffer: string | any, pub: RedisClient) {
    const packet = this.deserialize(buffer);
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

  public getPublisher(pub: RedisClient, pattern: any, id: string) {
    return response =>
      pub.publish(
        this.getResQueueName(pattern),
        JSON.stringify(Object.assign(response, { id })),
      );
  }

  public deserialize(content): ReadPacket & PacketId {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string): string {
    return `${pattern}_res`;
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }

  public getClientOptions(): Partial<ClientOpts> {
    const retry_strategy = options => this.createRetryStrategy(options);
    return {
      retry_strategy,
    };
  }

  public createRetryStrategy(
    options: RetryStrategyOptions,
  ): undefined | number | void {
    if (options.error && (options.error as any).code === 'ECONNREFUSED') {
      return this.logger.error(`Error ECONNREFUSED: ${this.url}`);
    }
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
