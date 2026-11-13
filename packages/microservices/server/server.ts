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
  throwError,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  mergeMap,
} from 'rxjs/operators';
import {
  DEFAULT_GRACE_PERIOD,
  EVENT_HANDLER_REPLY_DEPRECATED,
  NO_EVENT_HANDLER,
  UNSERIALIZABLE_PATTERN,
} from '../constants.js';
import { BaseRpcContext } from '../ctx-host/base-rpc.context.js';
import { IncomingRequestDeserializer } from '../deserializers/incoming-request.deserializer.js';
import { Transport } from '../enums/index.js';
import { InvalidPacketIdException } from '../errors/invalid-packet-id.exception.js';
import { ConsumerDeserializer } from '../interfaces/deserializer.interface.js';
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
} from '../interfaces/index.js';
import { ConsumerSerializer } from '../interfaces/serializer.interface.js';
import { IdentitySerializer } from '../serializers/identity.serializer.js';
import {
  exceedsPatternLimits,
  transformPatternToRoute,
} from '../utils/index.js';
import { ITransportServer, Logger, type LoggerService } from '@nestjs/common';
import {
  isNil,
  isNumber,
  isString,
  loadPackage,
  loadPackageSync,
} from '@nestjs/common/internal';
import { MESSAGES } from '@nestjs/core/internal';

const MAX_PACKET_ID_LENGTH = 256;

// Matches every text JSON.parse() accepts. A string pattern it does not match
// (e.g. "user.created") is used as it is, as parsing it would only throw.
const JSON_TEXT = /^\s*(?:[{["\-\d]|(?:true|false|null)\s*$)/;
// Far longer than the route of any pattern within the limits of a route, and
// short enough for parsing it to stay cheap
const MAX_JSON_PATTERN_LENGTH = 1024 * 1024;
// The longest delay setTimeout() supports: it fires a longer one (e.g.
// Infinity) after 1 ms instead
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * @publicApi
 */
export abstract class Server<
  EventsMap extends Record<string, Function> = Record<string, Function>,
  Status extends string = string,
> implements ITransportServer {
  /**
   * Unique transport identifier.
   */
  public transportId?: Transport | symbol;

  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger: LoggerService = new Logger(Server.name);
  /**
   * Event handlers that have replied to a request, so that the deprecation
   * is logged once per pattern.
   */
  private readonly eventHandlersThatReplied = new WeakSet<MessageHandler>();
  /**
   * Whether this transport hands an event handler failure to its client
   * library, which then reports it. The base `handleEvent` connects the
   * stream without subscribing, so nothing observes the failure and Nest logs
   * it instead. `ServerKafka` awaits the stream and sets this to `true`.
   */
  public readonly propagatesEventHandlerErrors: boolean = false;
  protected serializer: ConsumerSerializer;
  protected deserializer: ConsumerDeserializer;
  protected onProcessingStartHook: (
    transportId: Transport | symbol,
    context: BaseRpcContext,
    done: () => Promise<any>,
  ) => void = (
    transportId: Transport | symbol,
    context: BaseRpcContext,
    done: () => Promise<any>,
  ) => done();
  protected onProcessingEndHook: (
    transportId: Transport | symbol,
    context: BaseRpcContext,
  ) => void;
  protected _status$ = new ReplaySubject<Status>(1);
  /**
   * Requests and events being handled. A request stays counted until its last
   * reply has been published.
   */
  private handlersInFlight = 0;
  private readonly handlersInFlightListeners = new Set<() => void>();

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

  /**
   * Sets the transport identifier.
   * @param transportId Unique transport identifier.
   */
  public setTransportId(transportId: Transport | symbol): void {
    this.transportId = transportId;
  }

  /**
   * Sets a hook that will be called when processing starts.
   */
  public setOnProcessingStartHook(
    hook: (
      transportId: Transport | symbol,
      context: unknown,
      done: () => Promise<any>,
    ) => void,
  ): void {
    this.onProcessingStartHook = hook;
  }

  /**
   * Sets a hook that will be called when processing ends.
   */
  public setOnProcessingEndHook(
    hook: (transportId: Transport | symbol, context: unknown) => void,
  ): void {
    this.onProcessingEndHook = hook;
  }

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
    // A string pattern such as '1.0' or 'true' is stored as it is, but parsing
    // it as json would turn it into another route, so it is tried first.
    if (this.messageHandlers.has(pattern)) {
      return this.messageHandlers.get(pattern)!;
    }
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
    // The queue is read through an index and emptied once drained, as each
    // shift() would move all the packets queued behind the one it removes
    let nextIndex = 0;
    let isProcessing = false;
    // The requester is answered with an error in place of a final reply that
    // cannot be published only once, as that error may fail to publish too
    let isFallbackQueued = false;
    // The response stream has settled, so the queue holds its last reply
    let isStreamSettled = false;
    const settleHandlerInFlight = this.trackHandlerInFlight();
    const scheduleOnNextTick = (data: WritePacket) => {
      if (data.isDisposed && dataQueue.length > nextIndex) {
        dataQueue[dataQueue.length - 1].isDisposed = true;
      } else {
        dataQueue.push(data);
      }
      if (!isProcessing) {
        isProcessing = true;
        process.nextTick(async () => {
          while (nextIndex < dataQueue.length) {
            const packet = dataQueue[nextIndex++];
            try {
              await respond(packet);
            } catch (err) {
              // A reply that cannot be published must neither surface as an
              // unhandled rejection nor stop the replies queued behind it.
              // When it was the last one, the requester still gets an error.
              this.logger.error(err);
              if (packet.isDisposed && !isFallbackQueued) {
                isFallbackQueued = true;
                dataQueue.push({
                  err: {
                    status: 'error',
                    message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
                  },
                  isDisposed: true,
                });
              }
            }
          }
          dataQueue.length = 0;
          nextIndex = 0;
          isProcessing = false;
          if (isStreamSettled) {
            settleHandlerInFlight();
          }
        });
      }
    };
    return stream$
      .pipe(
        catchError((err: any) => {
          scheduleOnNextTick({ err });
          return EMPTY;
        }),
        finalize(() => {
          isStreamSettled = true;
          scheduleOnNextTick({ isDisposed: true });
        }),
      )
      .subscribe((response: any) => scheduleOnNextTick({ response }));
  }

  /**
   * @param handler - the handler of `pattern`, if it was looked up already
   */
  public async handleEvent(
    pattern: string,
    packet: ReadPacket,
    context: BaseRpcContext,
    handler: MessageHandler | null = this.getHandlerByPattern(pattern),
  ): Promise<any> {
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER`${pattern}`);
    }
    return this.runWithProcessingHooks(context, async runEndHook => {
      const resultOrStream = await handler(packet.data, context);
      if (isObservable(resultOrStream)) {
        const connectableSource = connectable(
          resultOrStream.pipe(finalize(runEndHook)),
          {
            connector: () => new Subject(),
            resetOnDisconnect: false,
          },
        );
        connectableSource.connect();
      } else {
        runEndHook();
      }
    });
  }

  /**
   * Handles a request-response message. `produce` returns the response
   * stream, whose values are replied through `respond`, and the processing
   * end hook runs once that stream settles (or once `produce` rejects).
   */
  protected handleRequest(
    context: BaseRpcContext,
    produce: () => Promise<Observable<any>>,
    respond: (data: WritePacket) => Promise<unknown> | void,
  ) {
    return this.runWithProcessingHooks(context, async runEndHook => {
      let response$: Observable<any>;
      try {
        response$ = await produce();
      } catch (err) {
        // The handler promise rejected. An inherited HTTP filter does this
        // when it replies through host.switchToHttp().getResponse(): on RPC
        // that object is the context, so the reply throws. gRPC fails the
        // call with INTERNAL. Answer here too, then rethrow so the transport
        // still logs the rejection.
        if (this.shouldAnswerRejectedRequest(err)) {
          this.send(
            throwError(() => ({
              status: 'error',
              message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
            })).pipe(finalize(runEndHook)),
            respond,
          );
        }
        throw err;
      }
      this.send(response$.pipe(finalize(runEndHook)), respond);
    });
  }

  /**
   * Whether a request is answered with an error when `produce` rejects with
   * `err`, rather than only passing the rejection on to the transport.
   */
  protected shouldAnswerRejectedRequest(err: unknown): boolean {
    return true;
  }

  /**
   * Logs a deprecation warning the first time an event handler is about to
   * reply to a request (a packet with an id, sent with `ClientProxy#send`).
   * Event handlers still reply to requests, except on Kafka, but will not in
   * the next major version.
   */
  protected warnIfEventHandlerReplies(
    handler: MessageHandler,
    pattern: string,
  ) {
    if (!handler.isEventHandler || this.eventHandlersThatReplied.has(handler)) {
      return;
    }
    this.eventHandlersThatReplied.add(handler);
    this.logger.warn(EVENT_HANDLER_REPLY_DEPRECATED`${pattern}`);
  }

  /**
   * Runs `fn` between the processing start and end hooks.
   *
   * `fn` receives a runner that closes the span exactly once and attaches it
   * to the teardown of whatever stream it produces. If `fn` rejects before
   * that teardown can run, the span is closed here and the rejection travels
   * on to the transport's client library.
   *
   * `endHookContext` is for transports that report a different context to
   * the end hook than to the start hook (gRPC passes the request).
   */
  protected runWithProcessingHooks(
    context: BaseRpcContext,
    fn: (runEndHook: () => void) => Promise<void>,
    endHookContext: BaseRpcContext = context,
  ) {
    return this.onProcessingStartHook(this.transportId!, context, async () => {
      const settleHandlerInFlight = this.trackHandlerInFlight();
      const runEndHook = this.createProcessingEndHookRunner(endHookContext);
      const end = () => {
        runEndHook();
        settleHandlerInFlight();
      };
      try {
        await fn(end);
      } catch (err) {
        end();
        throw err;
      }
    });
  }

  /**
   * Resolves once no request or event is being handled, or after
   * `gracePeriod` milliseconds, whichever comes first. The period is 10
   * seconds unless a number is given.
   *
   * A transport calls it from `close()`, after it has stopped receiving
   * messages and before it closes its connection, so that the handlers in
   * flight can finish and publish their replies. A handler whose stream never
   * completes stays in flight, so the wait then lasts the whole period.
   *
   * A message counts from the moment its handling starts, once it has been
   * deserialized. With an asynchronous deserializer, a message received right
   * before `close()` may not be counted yet, so its handler can still run
   * after the connection has been closed.
   */
  protected waitForHandlersInFlight(gracePeriod?: number): Promise<void> {
    if (this.handlersInFlight === 0) {
      return Promise.resolve();
    }
    // A value that is not a number (NaN, "10s") gets the default period
    // rather than none, and a longer one than setTimeout() supports (e.g.
    // Infinity, to wait until the handlers are done) is capped
    const timeout = Math.min(
      isNil(gracePeriod) || isNaN(gracePeriod)
        ? DEFAULT_GRACE_PERIOD
        : gracePeriod,
      MAX_TIMEOUT,
    );
    return new Promise<void>(resolve => {
      const stopWaiting = () => {
        clearTimeout(timer);
        this.handlersInFlightListeners.delete(stopWaiting);
        resolve();
      };
      const timer = setTimeout(stopWaiting, timeout);
      this.handlersInFlightListeners.add(stopWaiting);
    });
  }

  /**
   * Counts a handler as in flight until the returned function is called.
   * Calling it again does nothing.
   */
  private trackHandlerInFlight(): () => void {
    this.handlersInFlight++;
    let isSettled = false;
    return () => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      this.handlersInFlight--;
      if (this.handlersInFlight === 0) {
        this.handlersInFlightListeners.forEach(listener => listener());
      }
    };
  }

  /**
   * Returns a function that runs the processing end hook exactly once.
   *
   * An event handler can fail either by rejecting or by returning a stream
   * that errors, and `ServerKafka#handleEvent` awaits that stream, so both the
   * `finalize` teardown and the `catch` block can be reached for a single
   * event. The hook closes a span, so it must not run twice.
   */
  protected createProcessingEndHookRunner(context: BaseRpcContext): () => void {
    let isEndHookCalled = false;
    return () => {
      if (isEndHookCalled) {
        return;
      }
      isEndHookCalled = true;
      this.onProcessingEndHook?.(this.transportId!, context);
    };
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
    loader?: () => T,
  ): T | Promise<T> {
    return loadPackage(name, ctx, loader);
  }

  protected loadPackageSynchronously<T = any>(
    name: string,
    ctx: string,
    loader?: () => T,
  ): T {
    return loadPackageSync(name, ctx, loader);
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
      // Parsing a longer one would cost many times its size, only for its
      // route to say that it exceeds the limits of a route
      validPattern =
        pattern.length <= MAX_JSON_PATTERN_LENGTH && JSON_TEXT.test(pattern)
          ? JSON.parse(pattern)
          : pattern;
    } catch (error) {
      // Uses a fundamental object (`pattern` variable without any conversion)
      validPattern = pattern;
    }
    return this.normalizePattern(validPattern);
  }

  protected normalizePattern(pattern: MsPattern): string {
    return transformPatternToRoute(pattern);
  }

  /**
   * Returns the string representation of an incoming message pattern.
   *
   * Patterns are client-controlled: serializing a deeply nested one makes
   * `JSON.stringify` throw a `RangeError`, which must not escape the message
   * handler (as an unhandled promise rejection that terminates the process).
   *
   * A pattern that exceeds the limits of a route is not serialized at all:
   * its handler would be looked up by parsing the text again, at several
   * times its size in memory, only for its route to say which limit it
   * exceeds. That route is returned instead.
   *
   * @param  {unknown} pattern - client pattern
   * @returns string
   */
  protected getPatternAsString(pattern: unknown): string {
    if (isString(pattern)) {
      return pattern;
    }
    if (exceedsPatternLimits(pattern)) {
      return this.normalizePattern(pattern as MsPattern);
    }
    try {
      return JSON.stringify(pattern);
    } catch {
      return UNSERIALIZABLE_PATTERN;
    }
  }

  /**
   * Throws unless the id of an incoming request is a number or a short string.
   *
   * Ids are client-controlled and every reply to the request carries a copy,
   * so a long string or a nested value would be copied and serialized once
   * per reply, which a handler that streams its response multiplies.
   *
   * @param  {unknown} id - request id
   */
  protected assertValidPacketId(id: unknown) {
    if (isNumber(id) || (isString(id) && id.length <= MAX_PACKET_ID_LENGTH)) {
      return;
    }
    throw new InvalidPacketIdException(MAX_PACKET_ID_LENGTH);
  }
}
