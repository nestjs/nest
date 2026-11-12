import {
  HttpException,
  HttpServer,
  HttpStatus,
  IntrinsicException,
  Logger,
  RequestMethod,
  MessageEvent,
} from '@nestjs/common';
import { SSE_ABORT_CONTROLLER } from '@nestjs/common/decorators/http/sse-signal.decorator';
import { isObject, isString } from '@nestjs/common/utils/shared.utils';
import { IncomingMessage, STATUS_CODES } from 'http';
import {
  EMPTY,
  lastValueFrom,
  Observable,
  isObservable,
  type OperatorFunction,
} from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { MESSAGES } from '../constants';
import { BaseExceptionFilter } from '../exceptions/base-exception-filter';
import {
  AdditionalHeaders,
  WritableHeaderStream,
  SseStream,
} from './sse-stream';

/**
 * Characters of events that may wait for an SSE client that is not
 * reading them before its connection is dropped, unless the route sets its
 * own `maxPendingDataLength` (see `@Sse()`). Events wait once the stream and
 * socket buffers are full, as a producer cannot be paused. See
 * `getDataLength()` for what each of them counts for.
 */
const DEFAULT_MAX_PENDING_DATA_LENGTH = 4 * 1024 * 1024;

/**
 * How often, in milliseconds, an SSE connection that Node.js has stopped
 * reading from is written to, to find out whether its client is still there
 * (see `sse()`). A client that left is noticed by the second write at the
 * latest: the first one may still be accepted, and answered with a reset.
 */
const PAUSED_SOCKET_PROBE_INTERVAL = 5_000;

/**
 * The surface the router listens on to learn that the client is gone.
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

/**
 * The request's socket, or the response, whichever the router can listen on
 * for the connection to close.
 */
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
    this.applicationRef.redirect(response, statusCode, url);
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
      additionalHeaders?: AdditionalHeaders;
      statusCode?: number;
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
    const statusCode =
      options?.statusCode ??
      (response as { statusCode?: number }).statusCode ??
      200;

    // Create a per-request AbortController and expose its signal on the request
    // object so async @Sse() handlers can observe client disconnects (via the
    // @SseSignal() parameter decorator) and stop/clean up in-flight setup work.
    // The controller is reused if one was already attached upstream (e.g. when the
    // handler is wrapped by interceptors and the signal was created earlier).
    const abortController = this.getOrCreateAbortController(request);

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let closeRequested = false;
      let subscription: { unsubscribe(): void } | undefined;
      const disconnectSource = request.socket ?? response;

      // Ends the request-scoped lifetime: stops listening for disconnects and
      // aborts the signal handed to the route handler. Every terminal path of
      // the SSE lifecycle (disconnect, completion, error) funnels through here,
      // so a handler that ties its resources to the signal releases them once,
      // regardless of how the stream ended. `abort()` is idempotent, so paths
      // that already aborted on disconnect are unaffected.
      let stopWaitingForClose: (() => void) | undefined;
      const finalize = () => {
        stopWaitingForClose?.();
        clearInterval(pausedSocketProbe);
        abortController.abort();
      };

      // A socket that is neither read from nor written to does not learn that
      // the client has left, so "close" never comes. Node.js stops reading
      // from an HTTP/1 connection while the answers to pipelined requests pile
      // up behind this response, and while nobody reads the rest of the
      // request body. A producer that stays quiet would then be kept for good,
      // so a comment, which clients ignore, is written from time to time: the
      // write fails once the client is gone, which closes the socket. A stream
      // that is backed up has a write pending already, and nothing is written
      // before the headers are, while an exception filter can still answer.
      const pausedSocketProbe = setInterval(() => {
        if (
          (request.httpVersionMajor ?? 1) === 1 &&
          request.socket?.isPaused?.() &&
          stream.headersCommitted &&
          !stream.writableNeedDrain
        ) {
          stream.writeMessage({ comment: '' }, () => undefined);
        }
      }, PAUSED_SOCKET_PROBE_INTERVAL);
      pausedSocketProbe.unref?.();

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

      // Node validates the header values only once they are written, and they
      // are also written outside the handler's promise chain (from a timer),
      // where a throw would go uncaught. The error is handed to the exception
      // filters, which can still answer as no header has been sent. The
      // stream is unpiped first, as the pipe would otherwise end the response
      // with it.
      const commitHeaders = (): boolean => {
        try {
          stream.commitHeaders();
          return true;
        } catch (err) {
          settled = true;
          finalize();
          unsubscribe();
          stream.unpipe(response);
          endStream();
          reject(err);
          return false;
        }
      };

      const onClose = () => {
        if (settled || closeRequested) {
          return;
        }

        closeRequested = true;

        if (!subscription) {
          finalize();
          return;
        }

        settled = true;
        finalize();
        unsubscribe();
        endStream();
        response.end();
        resolve();
      };

      stopWaitingForClose = onceClosed(disconnectSource, onClose);

      Promise.resolve(result)
        .then(observableResult => {
          if (settled) {
            return;
          }

          this.assertObservable(observableResult);

          if (closeRequested) {
            // The client disconnected while the async handler was resolving.
            // Do not subscribe the producer Observable after the consumer has
            // already gone away — subscribing only to abort it in the same tick
            // would start producer side effects just to immediately cancel them.
            settled = true;
            endStream();
            response.end();
            resolve();
            return;
          }

          stream.pipe(response, {
            additionalHeaders: options?.additionalHeaders,
            statusCode,
          });

          let pendingDataLength = 0;
          // A limit that is not a number (e.g. NaN from
          // "Number(process.env.UNSET)") gets the default, as a missing one
          // does: no check below trips for NaN.
          const maxPendingDataLength =
            options?.maxPendingDataLength == null ||
            isNaN(options.maxPendingDataLength)
              ? DEFAULT_MAX_PENDING_DATA_LENGTH
              : options.maxPendingDataLength;
          subscription = observableResult
            .pipe(
              map((message): MessageEvent => {
                const event = isObject(message)
                  ? (message as MessageEvent)
                  : { data: message as object | string };
                // Object data is serialized here rather than in the SseStream,
                // so that its length counts towards the pending data below.
                // Fields are copied one by one, as a spread would drop the
                // getters of an event implemented as a class.
                return isObject(event.data)
                  ? {
                      type: event.type,
                      id: event.id,
                      retry: event.retry,
                      comment: event.comment,
                      data: JSON.stringify(event.data),
                    }
                  : event;
              }),
              // Events wait in concatMapWrites() while the client is not reading.
              // Past a limit, the connection is dropped as if the client had
              // disconnected, rather than holding events for a client that may
              // never read them. An EventSource then reconnects, and sends the
              // id of the last event it received. A limit of 0, like Infinity,
              // keeps every event.
              tap(message => {
                pendingDataLength += getDataLength(message);
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
              }),
              concatMapWrites(
                message =>
                  new Promise<void>(resolve =>
                    stream.writeMessage(message, () => {
                      pendingDataLength -= getDataLength(message);
                      resolve();
                    }),
                  ),
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
                // Error, which must not reach the client either: the event
                // carries the standard message of the status instead.
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
                settled = true;
                finalize();
                endStream();
                reject(err);
              },
              complete: () => {
                if (settled) {
                  return;
                }
                settled = true;
                finalize();
                endStream();
                resolve();
              },
            });

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

          if (closeRequested) {
            settled = true;
            endStream();
            response.end();
            resolve();
            return;
          }

          settled = true;
          finalize();
          endStream();
          reject(err);
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
