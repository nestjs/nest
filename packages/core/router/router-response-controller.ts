import {
  HttpException,
  type HttpServer,
  HttpStatus,
  IntrinsicException,
  Logger,
  RequestMethod,
  type MessageEvent,
  SSE_ABORT_CONTROLLER,
  StreamableFile,
} from '@nestjs/common';
import { IncomingMessage, STATUS_CODES } from 'http';
import {
  EMPTY,
  lastValueFrom,
  Observable,
  isObservable,
  type OperatorFunction,
} from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Readable } from 'stream';
import type { AbstractHttpAdapter } from '../adapters/http-adapter.js';
import { MESSAGES } from '../constants.js';
import { BaseExceptionFilter } from '../exceptions/base-exception-filter.js';
import {
  AdditionalHeadersSource,
  StatusCodeSource,
  WritableHeaderStream,
  SseStream,
} from './sse-stream.js';
import {
  cancelStreamingBody,
  getWebResponseHeaders,
  inferContentType,
  isStreamingBodyConsumed,
  isWebResponse,
  openStreamingBody,
  type StreamingBody,
  type StreamingBodyIterator,
  toReadable,
  toResponseChunk,
} from './streaming-body.js';
import { isNil, isObject, isString } from '@nestjs/common/internal';

/**
 * Characters of events that may wait for an SSE client that is not
 * reading them before its connection is dropped, unless the route sets its
 * own `maxPendingDataLength` (see `@Sse()`). Events wait once the stream and
 * socket buffers are full, as a producer cannot be paused. See
 * `getDataLength()` for what each of them counts for.
 */
const DEFAULT_MAX_PENDING_DATA_LENGTH = 4 * 1024 * 1024;

/**
 * The surface the SSE lifecycle listens on to learn that the client is gone.
 * Runtimes that emulate "node:http" without a real "net.Socket" (e.g.
 * Cloudflare Workers) expose a socket-like object that only carries address
 * information, so it cannot be used as an event source.
 */
interface CloseSource {
  destroyed?: boolean;
  once(event: 'close', listener: () => void): unknown;
  removeListener(event: 'close', listener: () => void): unknown;
}

function isCloseSource(source: unknown): source is CloseSource {
  return (
    typeof (source as Partial<CloseSource> | undefined)?.once === 'function'
  );
}

export function pickCloseSource(
  socket: unknown,
  response: unknown,
): CloseSource | undefined {
  if (isCloseSource(socket)) {
    return socket;
  }
  return isCloseSource(response) ? response : undefined;
}

interface CloseWatcher {
  callbacks: Set<() => void>;
  listener: () => void;
}

/**
 * The callbacks waiting for a connection to close, by close source. A source
 * gets a single listener, however many of its requests are waiting: the client
 * chooses how many requests it pipelines on a connection, and an
 * `EventEmitter` searches all the listeners of an event to remove one of them,
 * so a listener per request costs time quadratic in their number.
 */
const closeWatchers = new WeakMap<CloseSource, CloseWatcher>();

/**
 * Calls `callback` once `source` closes.
 * @returns a function that stops waiting. Once nothing waits for `source`
 * anymore, no listener is left on it.
 */
export function onceClosed(
  source: CloseSource,
  callback: () => void,
): () => void {
  let watcher = closeWatchers.get(source);
  if (!watcher) {
    const callbacks = new Set<() => void>();
    const listener = () => {
      closeWatchers.delete(source);
      callbacks.forEach(call => call());
    };
    watcher = { callbacks, listener };
    closeWatchers.set(source, watcher);
    source.once('close', listener);
  }
  const { callbacks, listener } = watcher;
  callbacks.add(callback);
  return () => {
    if (
      callbacks.delete(callback) &&
      callbacks.size === 0 &&
      closeWatchers.get(source)?.callbacks === callbacks
    ) {
      closeWatchers.delete(source);
      source.removeListener('close', listener);
    }
  };
}

/**
 * The least an event counts for while it waits for a client that is not
 * reading: about what the shortest one takes once it is written
 * (`id: 1\ndata: \n\n`).
 */
const MIN_PENDING_EVENT_LENGTH = 16;

function getLength(field: unknown): number {
  return isString(field) ? field.length : 0;
}

/**
 * What a waiting event counts for. It takes up memory whatever it carries, so
 * an event with little or no data (e.g. `{ type: 'changed', data: '' }`)
 * counts as well: events that count for nothing would wait without limit.
 */
function getDataLength(message: MessageEvent): number {
  return Math.max(
    MIN_PENDING_EVENT_LENGTH,
    getLength(message.data) +
      getLength(message.comment) +
      getLength(message.type) +
      getLength(message.id),
  );
}

/**
 * Waiting events written in a row before the event loop gets a turn. A write
 * that does not back the stream up settles through `process.nextTick()` and a
 * promise, so the events that waited would otherwise all be written before
 * any other request is served.
 */
const MAX_WRITES_PER_TURN = 1024;

interface WaitingValue<T> {
  value: T;
  next?: WaitingValue<T>;
}

/**
 * `concatMap(write)` for the events of a client, which decides how many of
 * them wait by not reading. `concatMap()` `shift()`s each waiting value off an
 * array of all the waiting ones, so writing them costs time quadratic in
 * their number. Here they wait in a linked list, and are not written in a
 * single turn of the event loop.
 */
function concatMapWrites<T>(
  write: (value: T) => Promise<void>,
): OperatorFunction<T, never> {
  return source =>
    new Observable<never>(subscriber => {
      let head: WaitingValue<T> | undefined;
      let tail: WaitingValue<T> | undefined;
      let isWriting = false;
      let isYielding = false;
      let isSourceComplete = false;
      let writesLeftInThisTurn = MAX_WRITES_PER_TURN;

      const writeNext = () => {
        if (subscriber.closed) {
          return;
        }
        if (!head) {
          isWriting = false;
          writesLeftInThisTurn = MAX_WRITES_PER_TURN;
          if (isSourceComplete) {
            subscriber.complete();
          }
          return;
        }
        const { value } = head;
        head = head.next;
        isWriting = true;
        write(value).then(
          () => {
            if (!head || --writesLeftInThisTurn > 0) {
              return writeNext();
            }
            writesLeftInThisTurn = MAX_WRITES_PER_TURN;
            isYielding = true;
            setImmediate(() => {
              isYielding = false;
              writeNext();
            });
          },
          err => subscriber.error(err),
        );
      };

      subscriber.add(
        source.subscribe({
          next: value => {
            const waiting: WaitingValue<T> = { value };
            tail = head ? (tail!.next = waiting) : (head = waiting);
            if (isYielding) {
              // Written in the next turn on top of those that waited before,
              // or a producer that emits more than MAX_WRITES_PER_TURN events
              // per turn would get ahead of a client that is reading.
              writesLeftInThisTurn++;
            } else if (!isWriting) {
              writeNext();
            }
          },
          error: err => subscriber.error(err),
          complete: () => {
            isSourceComplete = true;
            if (!isWriting) {
              writeNext();
            }
          },
        }),
      );
    });
}

export interface CustomHeader {
  name: string;
  value: string | (() => string);
}

export interface RedirectResponse {
  url: string;
  statusCode?: number;
}

export class RouterResponseController {
  private readonly logger = new Logger(RouterResponseController.name);
  private readonly exceptionFilter = new BaseExceptionFilter();

  constructor(private readonly applicationRef: HttpServer) {}

  public async apply<TInput = any, TResponse = any>(
    result: TInput,
    response: TResponse,
    httpStatusCode?: number,
  ) {
    return this.applicationRef.reply(response, result, httpStatusCode);
  }

  /**
   * Sends a web `Response`, a `ReadableStream` or an async iterable as it is
   * produced, through the adapter's `StreamableFile` path, which gives each of
   * them backpressure, and stops the stream when the client goes away.
   *
   * The headers wait for the first chunk, as exception filters can no longer
   * answer once they are sent. A `Response` is the whole answer: its status and
   * headers win over those set before it (by `@HttpCode()`, `@Header()` or a
   * middleware), which it otherwise leaves in place.
   */
  public async stream<TResponse = any, TRequest = any>(
    body: StreamingBody,
    response: TResponse,
    request: TRequest,
    options: { statusCode?: number } = {},
  ) {
    const webResponse = isWebResponse(body) ? body : undefined;
    const source = webResponse ? webResponse.body : (body as ReadableStream);
    if (isStreamingBodyConsumed(body)) {
      throw new TypeError(
        'The route handler returned a body that has been read already, so it cannot be sent.',
      );
    }
    const statusCode = webResponse?.status ?? options.statusCode;
    const reply = (replyBody?: unknown) =>
      this.applicationRef.reply(response, replyBody, statusCode);

    if (isNil(source)) {
      this.setWebResponseHeaders(response, webResponse);
      return reply();
    }
    const rawRequest = (request as any).raw ?? request;
    // A HEAD response has no body, so a handler's generator is not even started.
    // Fastify gets an empty stream rather than an empty body, which would reset
    // the Content-Length of the Response to 0.
    if (rawRequest.method === 'HEAD') {
      void cancelStreamingBody(body);
      this.setWebResponseHeaders(response, webResponse);
      return reply(new StreamableFile(Readable.from([])));
    }

    const iterator = openStreamingBody(source);
    const first = await this.readFirst(
      iterator,
      rawRequest,
      (response as any).raw ?? response,
    );
    if (!first) {
      void iterator.return().catch(() => undefined);
      return;
    }
    if (first.done) {
      this.setWebResponseHeaders(response, webResponse);
      return reply();
    }

    let firstChunk: string | Uint8Array;
    try {
      firstChunk = toResponseChunk(first.value);
      this.setWebResponseHeaders(response, webResponse);
    } catch (err) {
      void iterator.return().catch(() => undefined);
      throw err;
    }

    const stream = toReadable(iterator, firstChunk);
    // Logged here rather than by the file, as not every adapter reports a
    // failure to it, and a write to a client that left is not one to log.
    stream.on('error', err => {
      if (!(err instanceof IntrinsicException)) {
        this.logger.error(err);
      }
    });
    const file = new StreamableFile(stream, {
      type: webResponse ? undefined : inferContentType(first.value),
    }).setErrorLogger(() => undefined);
    try {
      return await reply(file);
    } catch (err) {
      stream.destroy();
      throw err;
    }
  }

  /**
   * Resolves to the first result of the body, or to nothing if the client goes
   * away first: that result may take a while, and may be paid for.
   */
  private readFirst(
    iterator: StreamingBodyIterator,
    request: IncomingMessage,
    response: unknown,
  ): Promise<IteratorResult<unknown> | undefined> {
    const disconnectSource = pickCloseSource(request.socket, response);
    if (disconnectSource?.destroyed) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve, reject) => {
      const stopWaitingForClose =
        disconnectSource &&
        onceClosed(disconnectSource, () => resolve(undefined));
      iterator
        .next()
        .then(resolve, reject)
        .finally(() => stopWaitingForClose?.());
    });
  }

  private setWebResponseHeaders<TResponse = unknown>(
    response: TResponse,
    webResponse: Response | undefined,
  ) {
    if (!webResponse) {
      return;
    }
    for (const [name, value] of getWebResponseHeaders(webResponse)) {
      this.applicationRef.setHeader(response, name, value);
    }
    for (const cookie of webResponse.headers.getSetCookie()) {
      (this.applicationRef as AbstractHttpAdapter).appendHeader(
        response,
        'Set-Cookie',
        cookie,
      );
    }
  }

  public async redirect<TInput = any, TResponse = any>(
    resultOrDeferred: TInput,
    response: TResponse,
    redirectResponse: RedirectResponse,
  ) {
    const result = await this.transformToResult(resultOrDeferred);
    const statusCode =
      result && result.statusCode
        ? result.statusCode
        : redirectResponse.statusCode
          ? redirectResponse.statusCode
          : HttpStatus.FOUND;
    const url = result && result.url ? result.url : redirectResponse.url;
    return this.applicationRef.redirect(response, statusCode, url);
  }

  public async render<TInput = unknown, TResponse = unknown>(
    resultOrDeferred: TInput,
    response: TResponse,
    template: string,
  ) {
    const result = await this.transformToResult(resultOrDeferred);
    return this.applicationRef.render(response, template, result);
  }

  public async transformToResult(resultOrDeferred: any) {
    if (isObservable(resultOrDeferred)) {
      return lastValueFrom(resultOrDeferred);
    }
    return resultOrDeferred;
  }

  public getStatusByMethod(requestMethod: RequestMethod): number {
    switch (requestMethod) {
      case RequestMethod.POST:
        return HttpStatus.CREATED;
      default:
        return HttpStatus.OK;
    }
  }

  public setHeaders<TResponse = unknown>(
    response: TResponse,
    headers: CustomHeader[],
  ) {
    headers.forEach(({ name, value }) =>
      this.applicationRef.setHeader(
        response,
        name,
        typeof value === 'function' ? value() : value,
      ),
    );
  }

  public setStatus<TResponse = unknown>(
    response: TResponse,
    statusCode: number,
  ) {
    this.applicationRef.status(response, statusCode);
  }

  public async sse<
    TInput extends Observable<unknown> = any,
    TResponse extends WritableHeaderStream = any,
    TRequest extends IncomingMessage = any,
  >(
    result: TInput | Promise<TInput>,
    response: TResponse,
    request: TRequest,
    options?: {
      additionalHeaders?: AdditionalHeadersSource;
      statusCode?: StatusCodeSource;
      maxPendingDataLength?: number;
    },
  ) {
    // It's possible that we sent headers already so don't use a stream
    if (response.writableEnded) {
      // The response is already gone: abort the request-scoped signal so
      // handler cleanup wired to @SseSignal() still runs, and swallow late
      // handler rejections that can no longer be delivered to the client.
      this.getOrCreateAbortController(request).abort();
      Promise.resolve(result).catch((err: unknown) => this.logger.error(err));
      return;
    }

    const stream = new SseStream(request);

    // Create a per-request AbortController and expose its signal on the request
    // object so async @Sse() handlers can observe client disconnects (via the
    // @SseSignal() parameter decorator) and stop/clean up in-flight setup work.
    // The controller is reused if one was already attached upstream (e.g. when the
    // handler is wrapped by interceptors and the signal was created earlier).
    const abortController = this.getOrCreateAbortController(request);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let subscription: { unsubscribe(): void } | undefined;
      // The response is a stream in every adapter, so it can still report the
      // disconnect when the socket cannot. When neither source can, the
      // listener is skipped rather than breaking the handler.
      const disconnectSource = pickCloseSource(request.socket, response);

      // Ends the request-scoped lifetime: stops listening for disconnects and
      // aborts the signal handed to the route handler. Every terminal path of
      // the SSE lifecycle (disconnect, completion, error) funnels through here,
      // so a handler that ties its resources to the signal releases them once,
      // regardless of how the stream ended. `abort()` is idempotent, so paths
      // that already aborted on disconnect are unaffected.
      let stopWaitingForClose: (() => void) | undefined;
      const finalize = () => {
        stopWaitingForClose?.();
        abortController.abort();
      };

      // Unsubscribing runs the teardown of the producer, which is application
      // code, and it is also run outside the handler's promise chain (from a
      // socket event or a timer), where a throw would go uncaught.
      const unsubscribe = () => {
        try {
          subscription?.unsubscribe();
        } catch (err) {
          this.logger.error(err);
        }
      };

      const endStream = () => {
        if (!stream.writableEnded) {
          stream.end();
        }
      };

      // Hands the error to the exception filters, which can still answer as
      // long as no header has been sent. The stream is unpiped first, as the
      // pipe would otherwise end the response with it, before a filter that
      // awaits anything gets to write.
      const fail = (err: unknown) => {
        settled = true;
        finalize();
        unsubscribe();
        stream.unpipe(response);
        endStream();
        reject(err);
      };

      // Node validates the header values only once they are written, and they
      // are also written outside the handler's promise chain (from a timer,
      // or once the producer completes), where a throw would go uncaught.
      const commitHeaders = (): boolean => {
        try {
          stream.commitHeaders();
          return true;
        } catch (err) {
          fail(err);
          return false;
        }
      };

      const onClose = () => {
        if (settled) {
          return;
        }

        settled = true;
        finalize();
        unsubscribe();
        endStream();
        response.end();
        resolve();
      };

      stopWaitingForClose =
        disconnectSource && onceClosed(disconnectSource, onClose);
      // The client may have disconnected before the handler ran (e.g., during
      // a guard), in which case "close" has already been emitted.
      if (disconnectSource?.destroyed) {
        onClose();
      }

      Promise.resolve(result)
        .then(observableResult => {
          if (settled) {
            // Setup may resolve after the client has disconnected. Leave its
            // producer unsubscribed, without keeping the router lifecycle open.
            return;
          }

          this.assertObservable(observableResult);

          stream.pipe(response, {
            additionalHeaders: options?.additionalHeaders,
            statusCode: options?.statusCode ?? (() => response.statusCode),
          });

          let pendingDataLength = 0;
          const maxPendingDataLength =
            options?.maxPendingDataLength ?? DEFAULT_MAX_PENDING_DATA_LENGTH;
          // Events wait in concatMapWrites() while the client is not reading.
          // Past a limit, the connection is dropped as if the client had
          // disconnected, rather than holding events for a client that may
          // never read them. An EventSource then reconnects, and sends the
          // id of the last event it received. A limit of 0, like Infinity,
          // keeps every event.
          const dropIfNotReading = () => {
            if (
              maxPendingDataLength &&
              pendingDataLength > maxPendingDataLength &&
              stream.writableNeedDrain
            ) {
              this.logger.warn(
                `The client is not reading its events: ${pendingDataLength} character(s) of events are queued for it, which exceeds the maximum allowed ${maxPendingDataLength}`,
              );
              (response as { destroy?(): void }).destroy?.();
              onClose();
            }
          };
          subscription = observableResult
            .pipe(
              map((message): MessageEvent => {
                const event = isObject(message)
                  ? (message as MessageEvent)
                  : { data: message as object | string };
                // The SseStream only receives string data. Serializing here
                // turns a JSON.stringify error (BigInts, circular references)
                // into an error of this pipeline, handled by catchError below,
                // instead of a throw that leaves the stream stuck mid-write.
                // Fields are copied one by one, as a spread would drop the
                // getters of an event implemented as a class.
                return isNil(event.data) || isString(event.data)
                  ? event
                  : {
                      type: event.type,
                      id: event.id,
                      retry: event.retry,
                      comment: event.comment,
                      data: JSON.stringify(event.data),
                    };
              }),
              tap(message => {
                pendingDataLength += getDataLength(message);
                dropIfNotReading();
              }),
              concatMapWrites(
                message =>
                  new Promise<void>((resolve, reject) => {
                    stream.writeMessage(message, err => {
                      pendingDataLength -= getDataLength(message);
                      return err ? reject(err) : resolve();
                    });
                    // A synchronous producer emits all of its events before
                    // the first write, while the stream is not backed up yet,
                    // and none after it. They are checked again once a write
                    // backs the stream up.
                    dropIfNotReading();
                  }),
              ),
              catchError(err => {
                if (!stream.headersCommitted) {
                  throw err;
                }

                // No exception filter can answer once the headers are out, so
                // BaseExceptionFilter's rules apply here: the client is only
                // sent the message of an HTTP error, unless it must not be
                // exposed, and any error but an IntrinsicException is logged.
                // An HttpException that wraps an Error, as in
                // `new UnauthorizedException(err)`, has the message of that
                // Error, which the adapters replace by the standard message
                // of the status when they send the body of the exception.
                const data =
                  err instanceof HttpException
                    ? err.getResponse() instanceof Error
                      ? (STATUS_CODES[err.getStatus()] ?? 'Error')
                      : err.message
                    : this.exceptionFilter.isHttpError(err)
                      ? this.exceptionFilter.getHttpErrorMessage(err)
                      : MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;
                if (!(err instanceof IntrinsicException)) {
                  this.logger.error(err);
                }
                stream.writeMessage({ type: 'error', data }, writeError => {
                  if (writeError) {
                    this.logger.error(writeError);
                  }
                });

                return EMPTY;
              }),
            )
            .subscribe({
              error: err => {
                if (settled) {
                  return;
                }
                fail(err);
              },
              complete: () => {
                if (settled) {
                  return;
                }
                // An empty producer is still a successful SSE response. Commit
                // before ending, since the deferred header task will be skipped.
                if (!commitHeaders()) {
                  return;
                }
                settled = true;
                finalize();
                endStream();
                resolve();
              },
            });

          // Guards against a "close" event emitted synchronously during
          // subscribe, before the subscription is assigned for onClose to cancel.
          if (settled) {
            unsubscribe();
          }

          // Commit SSE headers on the next macrotask. Pipe validation errors
          // propagate through microtasks (which complete before macrotasks),
          // so if the lifecycle errored, `settled` is already true and we
          // skip the write. Otherwise headers are sent immediately rather
          // than waiting for the first Observable emission.
          setTimeout(() => {
            if (settled || !commitHeaders()) {
              return;
            }
            // A HEAD response has no body, so it is complete once the headers
            // are sent. Left open, it would hold back the next request on the
            // same keep-alive connection until the producer completes.
            if (request.method === 'HEAD') {
              settled = true;
              finalize();
              unsubscribe();
              endStream();
              resolve();
            }
          }, 0);
        })
        .catch(err => {
          if (settled) {
            return;
          }

          fail(err);
        });
    });
  }

  private assertObservable(value: any) {
    if (!isObservable(value)) {
      throw new ReferenceError(
        'You must return an Observable stream to use Server-Sent Events (SSE).',
      );
    }
  }

  private getOrCreateAbortController(
    request: IncomingMessage,
  ): AbortController {
    const carrier = request as IncomingMessage & {
      [SSE_ABORT_CONTROLLER]?: AbortController;
    };
    if (!carrier[SSE_ABORT_CONTROLLER]) {
      carrier[SSE_ABORT_CONTROLLER] = new AbortController();
    }
    return carrier[SSE_ABORT_CONTROLLER];
  }
}
