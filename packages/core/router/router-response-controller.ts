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
import { IncomingMessage } from 'http';
import { EMPTY, lastValueFrom, Observable, isObservable } from 'rxjs';
import { catchError, concatMap, map, tap } from 'rxjs/operators';
import { MESSAGES } from '../constants';
import { BaseExceptionFilter } from '../exceptions/base-exception-filter';
import {
  AdditionalHeaders,
  WritableHeaderStream,
  SseStream,
} from './sse-stream';

/**
 * Characters of event data that may wait for an SSE client that is not
 * reading them before its connection is dropped, unless the route sets its
 * own `maxPendingDataLength` (see `@Sse()`). Events wait once the stream and
 * socket buffers are full, as a producer cannot be paused.
 */
const DEFAULT_MAX_PENDING_DATA_LENGTH = 4 * 1024 * 1024;

function getDataLength(message: MessageEvent): number {
  return (
    (isString(message.data) ? message.data.length : 0) +
    (isString(message.comment) ? message.comment.length : 0)
  );
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
      const finalize = () => {
        disconnectSource.removeListener('close', onClose);
        abortController.abort();
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
          subscription?.unsubscribe();
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
        subscription?.unsubscribe();
        endStream();
        response.end();
        resolve();
      };

      disconnectSource.once('close', onClose);

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
          const maxPendingDataLength =
            options?.maxPendingDataLength ?? DEFAULT_MAX_PENDING_DATA_LENGTH;
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
              // Events wait in concatMap() while the client is not reading.
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
                    `The client is not reading its events: ${pendingDataLength} character(s) of event data are queued for it, which exceeds the maximum allowed ${maxPendingDataLength}`,
                  );
                  (response as { destroy?(): void }).destroy?.();
                  onClose();
                }
              }),
              concatMap(
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
                const data =
                  err instanceof HttpException
                    ? err.message
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
              subscription?.unsubscribe();
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
