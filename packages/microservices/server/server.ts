import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import {
  ConnectableObservable,
  EMPTY as empty,
  from as fromPromise,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { catchError, finalize, publish } from 'rxjs/operators';
import { NO_EVENT_HANDLER } from '../constants';
import { BaseRpcContext } from '../ctx-host/base-rpc.context';
import { IncomingRequestDeserializer } from '../deserializers/incoming-request.deserializer';
import {
  ClientOptions,
  KafkaOptions,
  MessageHandler,
  MicroserviceOptions,
  MqttOptions,
  MsPattern,
  NatsOptions,
  ReadPacket,
  RedisOptions,
  RmqOptions,
  TcpOptions,
  WritePacket,
} from '../interfaces';
import { ConsumerDeserializer } from '../interfaces/deserializer.interface';
import { ConsumerSerializer } from '../interfaces/serializer.interface';
import { IdentitySerializer } from '../serializers/identity.serializer';
import { transformPatternToRoute } from '../utils';

export abstract class Server {
  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger = new Logger(Server.name);
  protected serializer: ConsumerSerializer;
  protected deserializer: ConsumerDeserializer;

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
  ) {
    const route = this.normalizePattern(pattern);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(route, callback);
  }

  public getHandlers(): Map<string, MessageHandler> {
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const route = this.getRouteFromPattern(pattern);
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => void,
  ): Subscription {
    let dataBuffer: WritePacket[] = null;
    const scheduleOnNextTick = (data: WritePacket) => {
      if (!dataBuffer) {
        dataBuffer = [data];
        process.nextTick(() => {
          dataBuffer.forEach(buffer => respond(buffer));
          dataBuffer = null;
        });
      } else if (!data.isDisposed) {
        dataBuffer = dataBuffer.concat(data);
      } else {
        dataBuffer[dataBuffer.length - 1].isDisposed = data.isDisposed;
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
          return empty;
        }),
        finalize(() => scheduleOnNextTick({ isDisposed: true })),
      )
      .subscribe((response: any) => scheduleOnNextTick({ response }));
  }

  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: BaseRpcContext,
  ): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(
        `${NO_EVENT_HANDLER} Event pattern: ${JSON.stringify(pattern)}.`,
      );
    }
    const resultOrStream = await handler(packet.data, context);
    if (this.isObservable(resultOrStream)) {
      (resultOrStream.pipe(publish()) as ConnectableObservable<any>).connect();
    }
  }

  public transformToObservable<T = any>(resultOrDeferred: any): Observable<T> {
    if (resultOrDeferred instanceof Promise) {
      return fromPromise(resultOrDeferred);
    } else if (!this.isObservable(resultOrDeferred)) {
      return of(resultOrDeferred);
    }
    return resultOrDeferred;
  }

  public getOptionsProp<
    T extends MicroserviceOptions['options'],
    K extends keyof T
  >(obj: T, prop: K, defaultValue: T[K] = undefined) {
    return obj && prop in obj ? obj[prop] : defaultValue;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected loadPackage<T = any>(
    name: string,
    ctx: string,
    loader?: Function,
  ): T {
    return loadPackage(name, ctx, loader);
  }

  protected initializeSerializer(options: ClientOptions['options']) {
    this.serializer =
      (options &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options']).serializer) ||
      new IdentitySerializer();
  }

  protected initializeDeserializer(options: ClientOptions['options']) {
    this.deserializer =
      (options &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options']).deserializer) ||
      new IncomingRequestDeserializer();
  }

  private isObservable(input: unknown): input is Observable<any> {
    return input && isFunction((input as Observable<any>).subscribe);
  }

  /**
   * Transforms the server Pattern to valid type and returns a route for him.
   *
   * @param  {string} pattern - server pattern
   * @returns string
   */
  protected getRouteFromPattern(pattern: string): string {
    let validPattern: MsPattern;

    try {
      validPattern = JSON.parse(pattern);
    } catch (error) {
      // Uses a fundamental object (`pattern` variable without any conversion)
      validPattern = pattern;
    }
    return this.normalizePattern(validPattern);
  }

  protected normalizePattern(pattern: MsPattern): string {
    return transformPatternToRoute(pattern);
  }
}
