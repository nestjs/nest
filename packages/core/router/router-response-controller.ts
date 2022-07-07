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
import { catchError, debounce, map } from 'rxjs/operators';
import {
  AdditionalHeaders,
  WritableHeaderStream,
  SseStream,
} from './sse-stream';

export interface CustomHeader {
  name: string;
  value: string;
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
      this.applicationRef.setHeader(response, name, value),
    );
  }

  public setStatus<TResponse = unknown>(
    response: TResponse,
    statusCode: number,
  ) {
    this.applicationRef.status(response, statusCode);
  }

  public sse<
    TInput extends Observable<unknown> = any,
    TResponse extends WritableHeaderStream = any,
    TRequest extends IncomingMessage = any,
  >(
    result: TInput,
    response: TResponse,
    request: TRequest,
    options?: { additionalHeaders: AdditionalHeaders },
  ) {
    // It's possible that we sent headers already so don't use a stream
    if (response.writableEnded) {
      return;
    }

    this.assertObservable(result);

    const stream = new SseStream(request);
    stream.pipe(response, options);

    const subscription = result
      .pipe(
        map((message): MessageEvent => {
          if (isObject(message)) {
            return message as MessageEvent;
          }

          return { data: message as object | string };
        }),
        debounce(
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
