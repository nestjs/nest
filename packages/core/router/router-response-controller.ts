import {
  HttpServer,
  HttpStatus,
  Logger,
  RequestMethod,
  MessageEvent,
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { IncomingMessage } from 'http';
import { EMPTY, lastValueFrom, Observable, isObservable } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import {
  AdditionalHeaders,
  WritableHeaderStream,
  SseStream,
} from './sse-stream';

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
    options?: { additionalHeaders: AdditionalHeaders },
  ) {
    // It's possible that we sent headers already so don't use a stream
    if (response.writableEnded) {
      return;
    }

    const observableResult = await Promise.resolve(result);

    this.assertObservable(observableResult);

    const stream = new SseStream(request);

    // Extract custom status code from response if it was set
    const customStatusCode = (response as any).statusCode;
    const pipeOptions =
      customStatusCode && customStatusCode !== 200
        ? { ...options, statusCode: customStatusCode }
        : options;

    stream.pipe(response, pipeOptions);

    const subscription = observableResult
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
        complete: () => {
          response.end();
        },
      });

    request.on('close', () => {
      subscription.unsubscribe();
      if (!stream.writableEnded) {
        stream.end();
      }
    });
  }

  private assertObservable(value: any) {
    if (!isObservable(value)) {
      throw new ReferenceError(
        'You must return an Observable stream to use Server-Sent Events (SSE).',
      );
    }
  }
}
