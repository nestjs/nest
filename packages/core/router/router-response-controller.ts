import {
  type HttpServer,
  HttpStatus,
  Logger,
  RequestMethod,
  type MessageEvent,
  SSE_ABORT_CONTROLLER,
} from '@nestjs/common';
import { IncomingMessage } from 'http';
import { EMPTY, lastValueFrom, Observable, isObservable } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  AdditionalHeadersSource,
  StatusCodeSource,
  WritableHeaderStream,
  SseStream,
} from './sse-stream.js';
import { isObject } from '@nestjs/common/internal';

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
      additionalHeaders?: AdditionalHeadersSource;
      statusCode?: StatusCodeSource;
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

      const onClose = () => {
        if (settled) {
          return;
        }

        settled = true;
        finalize();
        subscription?.unsubscribe();
        endStream();
        response.end();
        resolve();
      };

      const fail = (err: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        finalize();
        subscription?.unsubscribe();
        endStream();
        reject(err);
      };

      const commitHeaders = () => {
        try {
          stream.commitHeaders();
        } catch (err) {
          fail(err);
        }
      };

      disconnectSource.once('close', onClose);
      // The client may have disconnected before the handler ran (e.g., during
      // a guard), in which case "close" has already been emitted.
      if ((disconnectSource as { destroyed?: boolean }).destroyed) {
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

          subscription = observableResult
            .pipe(
              map((message): MessageEvent => {
                if (isObject(message)) {
                  return message as MessageEvent;
                }

                return { data: message as object | string };
              }),
              concatMap(
                message =>
                  new Promise<void>(resolve =>
                    stream.writeMessage(message, () => resolve()),
                  ),
              ),
              catchError(err => {
                if (!stream.headersCommitted) {
                  throw err;
                }

                const data = err instanceof Error ? err.message : err;
                stream.writeMessage({ type: 'error', data }, writeError => {
                  if (writeError) {
                    this.logger.error(writeError);
                  }
                });

                return EMPTY;
              }),
            )
            .subscribe({
              error: fail,
              complete: () => {
                if (settled) {
                  return;
                }
                // An empty producer is still a successful SSE response. Commit
                // before ending, since the deferred header task will be skipped.
                commitHeaders();
                if (settled) {
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
            subscription.unsubscribe();
          }

          // Commit SSE headers on the next macrotask. Pipe validation errors
          // propagate through microtasks (which complete before macrotasks),
          // so if the lifecycle errored, `settled` is already true and we
          // skip the write. Otherwise headers are sent immediately rather
          // than waiting for the first Observable emission.
          setTimeout(() => {
            if (!settled) {
              commitHeaders();
            }
          }, 0);
        })
        .catch(fail);
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
