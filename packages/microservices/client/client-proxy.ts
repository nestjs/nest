import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { isNil } from '@nestjs/common/utils/shared.utils';
import {
  throwError as _throw,
  connectable,
  defer,
  fromEvent,
  merge,
  Observable,
  Observer,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  mergeMap,
  shareReplay,
  take,
} from 'rxjs/operators';
import { IncomingResponseDeserializer } from '../deserializers/incoming-response.deserializer';
import { InvalidMessageException } from '../errors/invalid-message.exception';
import {
  ClientOptions,
  KafkaOptions,
  MqttOptions,
  MsPattern,
  NatsOptions,
  PacketId,
  ReadPacket,
  RedisOptions,
  RmqOptions,
  TcpClientOptions,
  WritePacket,
} from '../interfaces';
import { ProducerDeserializer } from '../interfaces/deserializer.interface';
import { ProducerSerializer } from '../interfaces/serializer.interface';
import { IdentitySerializer } from '../serializers/identity.serializer';
import { transformPatternToRoute } from '../utils';

/**
 * @publicApi
 */
export abstract class ClientProxy<
  EventsMap extends Record<never, Function> = Record<never, Function>,
  Status extends string = string,
> {
  protected routingMap = new Map<string, Function>();
  protected serializer: ProducerSerializer;
  protected deserializer: ProducerDeserializer;
  protected _status$ = new ReplaySubject<Status>(1);

  /**
   * Returns an observable that emits status changes.
   */
  public get status(): Observable<Status> {
    return this._status$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Establishes the connection to the underlying server/broker.
   */
  public abstract connect(): Promise<any>;
  /**
   * Closes the underlying connection to the server/broker.
   */
  public abstract close(): any;
  /**
   * Registers an event listener for the given event.
   * @param event Event name
   * @param callback Callback to be executed when the event is emitted
   */
  public on<
    EventKey extends keyof EventsMap = keyof EventsMap,
    EventCallback extends EventsMap[EventKey] = EventsMap[EventKey],
  >(event: EventKey, callback: EventCallback) {
    throw new Error('Method not implemented.');
  }
  /**
   * Returns an instance of the underlying server/broker instance,
   * or a group of servers if there are more than one.
   */
  public abstract unwrap<T>(): T;

  /**
   * Send a message to the server/broker.
   * Used for message-driven communication style between microservices.
   * @param pattern Pattern to identify the message
   * @param data Data to be sent
   * @returns Observable with the result
   */
  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(() => new InvalidMessageException());
    }
    return defer(async () => this.connect()).pipe(
      mergeMap(
        () =>
          new Observable((observer: Observer<TResult>) => {
            const callback = this.createObserver(observer);
            return this.publish({ pattern, data }, callback);
          }),
      ),
    );
  }

  /**
   * Emits an event to the server/broker.
   * Used for event-driven communication style between microservices.
   * @param pattern Pattern to identify the event
   * @param data Data to be sent
   * @returns Observable that completes when the event is successfully emitted
   */
  public emit<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(() => new InvalidMessageException());
    }

    const dispatchObservable = defer(() =>
      this.dispatchEvent({ pattern, data }),
    );
    const source = this.shouldCacheDispatch()
      ? defer(async () => this.connect()).pipe(
          mergeMap(() => dispatchObservable.pipe(shareReplay(1))),
        )
      : defer(async () => this.connect()).pipe(
          mergeMap(() => dispatchObservable),
        );
    const connectableSource = connectable(source, {
      connector: () => new Subject(),
      resetOnDisconnect: false,
    });
    connectableSource.connect();

    return connectableSource;
  }

  protected abstract publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): () => void;

  protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;

  /**
   * Determines whether the dispatch observable should be cached to avoid
   * reinitializing connections on each subscription.
   *
   * This method provides an opt-in mechanism for custom transport implementations
   * that manage persistent connections (e.g., Azure Service Bus, Kafka, custom message brokers)
   * to improve performance by reusing the same dispatch observable across multiple
   * subscriptions to the same emit() call.
   *
   * When enabled, the dispatch observable is cached using RxJS shareReplay(1),
   * which means:
   * - The connection is established only once per emit() call
   * - Multiple subscribers to the same observable share the same dispatch execution
   * - Subsequent subscriptions receive the cached result without re-executing dispatchEvent()
   *
   * This is particularly beneficial for transport implementations where:
   * - Connection establishment is expensive
   * - The underlying client maintains persistent connections
   * - Multiple consumers need to subscribe to the same event emission
   *
   * @returns {boolean} true if the dispatch observable should be cached, false otherwise
   *
   * @example
   * ```typescript
   * export class ServiceBusClientProxy extends ClientProxy {
   *   protected shouldCacheDispatch(): boolean {
   *     return true; // Enable caching for persistent connections
   *   }
   *
   *   // ... rest of implementation
   * }
   * ```
   *
   * @since 11.1.6
   */
  protected shouldCacheDispatch(): boolean {
    return false;
  }

  protected createObserver<T>(
    observer: Observer<T>,
  ): (packet: WritePacket) => void {
    return ({ err, response, isDisposed }: WritePacket) => {
      if (err) {
        return observer.error(this.serializeError(err));
      } else if (response !== undefined && isDisposed) {
        observer.next(this.serializeResponse(response));
        return observer.complete();
      } else if (isDisposed) {
        return observer.complete();
      }
      observer.next(this.serializeResponse(response));
    };
  }

  protected serializeError(err: any): any {
    return err;
  }

  protected serializeResponse(response: any): any {
    return response;
  }

  protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId {
    const id = randomStringGenerator();
    return Object.assign(packet, { id });
  }

  protected connect$(
    instance: any,
    errorEvent = 'error',
    connectEvent = 'connect',
  ): Observable<any> {
    const error$ = fromEvent(instance, errorEvent).pipe(
      map((err: any) => {
        throw err;
      }),
    );
    const connect$ = fromEvent(instance, connectEvent);
    return merge(error$, connect$).pipe(take(1));
  }

  protected getOptionsProp<
    Options extends ClientOptions['options'],
    Attribute extends keyof Options,
  >(obj: Options, prop: Attribute): Options[Attribute];
  protected getOptionsProp<
    Options extends ClientOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue,
  ): Required<Options>[Attribute];
  protected getOptionsProp<
    Options extends ClientOptions['options'],
    Attribute extends keyof Options,
    DefaultValue extends Options[Attribute] = Options[Attribute],
  >(
    obj: Options,
    prop: Attribute,
    defaultValue: DefaultValue = undefined as DefaultValue,
  ) {
    return obj && prop in obj ? (obj as any)[prop] : defaultValue;
  }

  protected normalizePattern(pattern: MsPattern): string {
    return transformPatternToRoute(pattern);
  }

  protected initializeSerializer(options: ClientOptions['options']) {
    this.serializer =
      (options &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpClientOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options'])!.serializer) ||
      new IdentitySerializer();
  }

  protected initializeDeserializer(options: ClientOptions['options']) {
    this.deserializer =
      (options &&
        (options as
          | RedisOptions['options']
          | NatsOptions['options']
          | MqttOptions['options']
          | TcpClientOptions['options']
          | RmqOptions['options']
          | KafkaOptions['options'])!.deserializer) ||
      new IncomingResponseDeserializer();
  }
}
