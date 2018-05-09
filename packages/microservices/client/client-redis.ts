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
import {
  RedisClient,
  ClientOpts,
  RetryStrategyOptions,
} from '../external/redis.interface';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Subject, fromEvent, merge, zip } from 'rxjs';
import { take } from 'rxjs/operators';

let redisPackage: any = {};

export class ClientRedis extends ClientProxy {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private pubClient: RedisClient;
  private subClient: RedisClient;
  private isExplicitlyTerminated = false;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<RedisOptions>(options, 'url') || REDIS_DEFAULT_URL;

    redisPackage = loadPackage('redis', ClientRedis.name);
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

  public connect(): Promise<any> {
    return new Promise((resolve, reject) => {
      const error$ = new Subject<Error>();

      this.pubClient = this.createClient(error$);
      this.subClient = this.createClient(error$);
      this.handleError(this.pubClient);
      this.handleError(this.subClient);

      const pubConnect$ = fromEvent(this.pubClient, CONNECT_EVENT);
      const subClient$ = fromEvent(this.subClient, CONNECT_EVENT);

      merge(error$, zip(pubConnect$, subClient$))
        .pipe(take(1))
        .subscribe(resolve, reject);
    });
  }

  public createClient(error$: Subject<Error>): RedisClient {
    return redisPackage.createClient({
      ...this.getClientOptions(error$),
      url: this.url,
    });
  }

  public handleError(client: RedisClient) {
    client.addListener(ERROR_EVENT, err => this.logger.error(err));
  }

  public getClientOptions(error$: Subject<Error>): Partial<ClientOpts> {
    const retry_strategy = options => this.createRetryStrategy(options, error$);
    return {
      retry_strategy,
    };
  }

  public createRetryStrategy(
    options: RetryStrategyOptions,
    error$: Subject<Error>,
  ): undefined | number | Error {
    if (options.error && (options.error as any).code === 'ECONNREFUSED') {
      error$.error(options.error);
      return options.error;
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

  protected async publish(
    partialPacket: ReadPacket,
    callback: (packet: WritePacket) => any,
  ) {
    try {
      if (!this.pubClient || !this.subClient) {
        await this.connect();
      }
      const packet = this.assignPacketId(partialPacket);
      const pattern = JSON.stringify(partialPacket.pattern);
      const responseChannel = this.getResPatternName(pattern);
      const responseCallback = (channel: string, buffer: string) => {
        const { err, response, isDisposed, id } = JSON.parse(
          buffer,
        ) as WritePacket & PacketId;
        if (id !== packet.id) {
          return undefined;
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
            return undefined;
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
    catch (err) {
      callback({ err });
    }
  }
}
