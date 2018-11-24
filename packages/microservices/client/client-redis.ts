import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { fromEvent, merge, Subject, zip } from 'rxjs';
import { share, take, tap } from 'rxjs/operators';
import {
  CONNECT_EVENT,
  ERROR_EVENT,
  MESSAGE_EVENT,
  REDIS_DEFAULT_URL,
} from '../constants';
import {
  ClientOpts,
  RedisClient,
  RetryStrategyOptions,
} from '../external/redis.interface';
import { PacketId, ReadPacket, RedisOptions, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { ECONNREFUSED } from './constants';

let redisPackage: any = {};

export class ClientRedis extends ClientProxy {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected pubClient: RedisClient;
  protected subClient: RedisClient;
  protected connection: Promise<any>;
  protected isExplicitlyTerminated = false;

  constructor(protected readonly options: ClientOptions['options']) {
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
    this.isExplicitlyTerminated = true;
  }

  public connect(): Promise<any> {
    if (this.pubClient && this.subClient) {
      return this.connection;
    }
    const error$ = new Subject<Error>();

    this.pubClient = this.createClient(error$);
    this.subClient = this.createClient(error$);
    this.handleError(this.pubClient);
    this.handleError(this.subClient);

    const pubConnect$ = fromEvent(this.pubClient, CONNECT_EVENT);
    const subClient$ = fromEvent(this.subClient, CONNECT_EVENT);

    this.connection = merge(error$, zip(pubConnect$, subClient$))
      .pipe(
        take(1),
        tap(() =>
          this.subClient.on(MESSAGE_EVENT, this.createResponseCallback()),
        ),
        share(),
      )
      .toPromise();
    return this.connection;
  }

  public createClient(error$: Subject<Error>): RedisClient {
    return redisPackage.createClient({
      ...this.getClientOptions(error$),
      url: this.url,
    });
  }

  public handleError(client: RedisClient) {
    client.addListener(ERROR_EVENT, (err: any) => this.logger.error(err));
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
    if (options.error && (options.error as any).code === ECONNREFUSED) {
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

  public createResponseCallback(): Function {
    return (channel: string, buffer: string) => {
      const { err, response, isDisposed, id } = JSON.parse(
        buffer,
      ) as WritePacket & PacketId;

      const callback = this.routingMap.get(id);
      if (!callback) {
        return;
      }
      if (isDisposed || err) {
        return callback({
          err,
          response: null,
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
  ): Function {
    try {
      const packet = this.assignPacketId(partialPacket);
      const pattern = this.normalizePattern(partialPacket.pattern);
      const responseChannel = this.getResPatternName(pattern);

      this.routingMap.set(packet.id, callback);
      this.subClient.subscribe(responseChannel, (err: any) => {
        if (err) {
          return;
        }
        this.pubClient.publish(
          this.getAckPatternName(pattern),
          JSON.stringify(packet),
        );
      });

      return () => {
        this.subClient.unsubscribe(responseChannel);
        this.routingMap.delete(packet.id);
      };
    } catch (err) {
      callback({ err });
    }
  }
}
