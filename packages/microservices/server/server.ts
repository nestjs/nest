import { Logger, LoggerService } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  connectable,
  EMPTY,
  from as fromPromise,
  isObservable,
  Observable,
  ObservedValueOf,
  of,
  ReplaySubject,
  Subject,
  Subscription,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  mergeMap,
} from 'rxjs/operators';
import { NO_EVENT_HANDLER } from '../constants';
import { BaseRpcContext } from '../ctx-host/base-rpc.context';
import { IncomingRequestDeserializer } from '../deserializers/incoming-request.deserializer';
import { Transport } from '../enums';
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

/**
 * @publicApi
 */
export abstract class Server<
  EventsMap extends Record<string, Function> = Record<string, Function>,
  Status extends string = string,
> {
  /**
   * Unique transport identifier.
   */
  readonly transportId?: Transport | symbol;

  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger: LoggerService = new Logger(Server.name);
  protected serializer: ConsumerSerializer;
  protected deserializer: ConsumerDeserializer;
  protected _status$ = new ReplaySubject<Status>(1);

  /**
   * Returns an observable that emits status changes.
   */
  public get status(): Observable<Status> {
    return this._status$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public abstract on<
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey],
  >(event: EventKey, callback: EventCallback): any;
  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public abstract unwrap<T>(): T;

  /**
   * Method called when server is being initialized.
   * @param callback Function to be called upon initialization
   */
  public abstract listen(callback: (...optionalParams: unknown[]) => any): any;
  /**
   * Method called when server is being terminated.
   */
  public abstract close(): any;

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
    extras: Record<string, any> = {},
  ) {
    const normalizedPattern = this.normalizePattern(pattern);
    callback.isEventHandler = isEventHandler;
    callback.extras = extras;

    if (this.messageHandlers.has(normalizedPattern) && isEventHandler) {
      const headRef = this.messageHandlers.get(normalizedPattern)!;
      const getTail = (handler: MessageHandler) =>
        handler?.next ? getTail(handler.next) : handler;

      const tailRef = getTail(headRef);
      tailRef.next = callback;
    } else {
      this.messageHandlers.set(normalizedPattern, callback);
    }
  }

  public getHandlers(): Map<string, MessageHandler> {
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const route = this.getRouteFromPattern(pattern);
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)!
      : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => Promise<unknown> | void,
  ): Subscription {
    const dataQueue: WritePacket[] = [];
    let isProcessing = false;
    const scheduleOnNextTick = (data: WritePacket) => {
      if (data.isDisposed && dataQueue.length > 0) {
        dataQueue[dataQueue.length - 1].isDisposed = true;
      } else {
        dataQueue.push(data);
      }
      if (!isProcessing) {
        isProcessing = true;
        process.nextTick(async () => {
          while (dataQueue.length > 0) {
            const packet = dataQueue.shift();
            if (packet) {
              await respond(packet);
            }
          }
          isProcessing = false;
        });
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
          return EMPTY;
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
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }
    const resultOrStream = await handler(packet.data, context);
    if (isObservable(resultOrStream)) {
      const connectableSource = connectable(resultOrStream, {
        connector: () => new Subject(),
        resetOnDisconnect: false,
      });
      connectableSource.connect();
    }
  }

  public transformToObservable<T>(
    resultOrDeferred: Observable<T> | Promise<T>,
  ): Observable<T>;
  public transformToObservable<T>(
    resultOrDeferred: T,
  ): never extends Observable<ObservedValueOf<T>>
    ? Observable<T>
    : Observable<ObservedValueOf<T>>;
  public transformToObservable(resultOrDeferred: any) {
    if (resultOrDeferred instanceof Promise) {
      return fromPromise(resultOrDeferred).pipe(
        mergeMap(val => (isObservable(val) ? val : of(val))),
      );
    }

    if (isObservable(resultOrDeferred)) {
      return resultOrDeferred;
    }

    return of(resultOrDeferred);
  }

  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
  >(obj: Options, prop: Attribute): Options[Attribute];
  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue,
  ): Required<Options>[Attribute];
  public getOptionsProp<
    Options extends MicroserviceOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue = undefined as DefaultValue,
  ) {
    return obj && prop in obj ? (obj as any)[prop] : defaultValue;
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
          | KafkaOptions['options'])!.serializer) ||
      new IdentitySerializer();
  }

  protected initializeDeserializer(options: ClientOptions['options']) {
    this.deserializer =
      (options! &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options'])!.deserializer) ||
      new IncomingRequestDeserializer();
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
