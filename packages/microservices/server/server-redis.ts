import { isUndefined } from '@nestjs/common/utils/shared.utils';
import {
  ERROR_EVENT,
  MESSAGE_EVENT,
  NO_MESSAGE_HANDLER,
  REDIS_DEFAULT_HOST,
  REDIS_DEFAULT_PORT,
} from '../constants';
import { RedisContext } from '../ctx-host';
import { Transport } from '../enums';
import {
  CustomTransportStrategy,
  IncomingRequest,
  RedisOptions,
} from '../interfaces';
import { Server } from './server';

type Redis = any;

let redisPackage = {} as any;

export class ServerRedis extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.REDIS;

  private subClient: Redis;
  private pubClient: Redis;
  private isExplicitlyTerminated = false;

  constructor(private readonly options: RedisOptions['options']) {
    super();

    redisPackage = this.loadPackage('ioredis', ServerRedis.name, () =>
      require('ioredis'),
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.subClient = this.createRedisClient();
      this.pubClient = this.createRedisClient();

      this.handleError(this.pubClient);
      this.handleError(this.subClient);

      this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public start(callback?: () => void) {
    Promise.all([this.subClient.connect(), this.pubClient.connect()])
      .then(() => {
        this.bindEvents(this.subClient, this.pubClient);
        callback();
      })
      .catch(callback);
  }

  public bindEvents(subClient: Redis, pubClient: Redis) {
    subClient.on(
      this.options.wildcards ? 'pmessage' : MESSAGE_EVENT,
      this.getMessageHandler(pubClient).bind(this),
    );
    const subscribePatterns = [...this.messageHandlers.keys()];
    subscribePatterns.forEach(pattern => {
      const { isEventHandler } = this.messageHandlers.get(pattern);

      const channel = isEventHandler
        ? pattern
        : this.getRequestPattern(pattern);

      if (this.options.wildcards) {
        subClient.psubscribe(channel);
      } else {
        subClient.subscribe(channel);
      }
    });
  }

  public close() {
    this.isExplicitlyTerminated = true;
    this.pubClient && this.pubClient.quit();
    this.subClient && this.subClient.quit();
  }

  public createRedisClient(): Redis {
    return new redisPackage({
      port: REDIS_DEFAULT_PORT,
      host: REDIS_DEFAULT_HOST,
      ...this.getClientOptions(),
      lazyConnect: true,
    });
  }

  public getMessageHandler(pub: Redis) {
    return this.options.wildcards
      ? (channel: string, pattern: string, buffer: string | any) =>
          this.handleMessage(channel, buffer, pub, pattern)
      : (channel: string, buffer: string | any) =>
          this.handleMessage(channel, buffer, pub, channel);
  }

  public async handleMessage(
    channel: string,
    buffer: string | any,
    pub: Redis,
    pattern: string,
  ) {
    const rawMessage = this.parseMessage(buffer);
    const packet = await this.deserializer.deserialize(rawMessage, { channel });
    const redisCtx = new RedisContext([pattern]);

    if (isUndefined((packet as IncomingRequest).id)) {
      return this.handleEvent(channel, packet, redisCtx);
    }
    const publish = this.getPublisher(
      pub,
      channel,
      (packet as IncomingRequest).id,
    );
    const handler = this.getHandlerByPattern(channel);

    if (!handler) {
      const status = 'error';
      const noHandlerPacket = {
        id: (packet as IncomingRequest).id,
        status,
        err: NO_MESSAGE_HANDLER,
      };
      return publish(noHandlerPacket);
    }
    const response$ = this.transformToObservable(
      await handler(packet.data, redisCtx),
    );
    response$ && this.send(response$, publish);
  }

  public getPublisher(pub: Redis, pattern: any, id: string) {
    return (response: any) => {
      Object.assign(response, { id });
      const outgoingResponse = this.serializer.serialize(response);

      return pub.publish(
        this.getReplyPattern(pattern),
        JSON.stringify(outgoingResponse),
      );
    };
  }

  public parseMessage(content: any): Record<string, any> {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getRequestPattern(pattern: string): string {
    return pattern;
  }

  public getReplyPattern(pattern: string): string {
    return `${pattern}.reply`;
  }

  public handleError(stream: any) {
    stream.on(ERROR_EVENT, (err: any) => this.logger.error(err));
  }

  public getClientOptions(): Partial<RedisOptions['options']> {
    const retryStrategy = (times: number) => this.createRetryStrategy(times);

    return {
      ...(this.options || {}),
      retryStrategy,
    };
  }

  public createRetryStrategy(times: number): undefined | number | void {
    if (this.isExplicitlyTerminated) {
      return undefined;
    }
    if (
      !this.getOptionsProp(this.options, 'retryAttempts') ||
      times > this.getOptionsProp(this.options, 'retryAttempts')
    ) {
      this.logger.error(`Retry time exhausted`);
      return;
    }
    return this.getOptionsProp(this.options, 'retryDelay') || 0;
  }
}
