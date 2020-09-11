import {
  HttpServer,
  HttpStatus,
  RequestMethod,
  MessageEvent,
} from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import { SseStream, HeaderStream } from '../services';
import { IncomingMessage, ServerResponse } from 'http';
import { debounce } from 'rxjs/operators';

export interface CustomHeader {
  name: string;
  value: string;
}

export interface RedirectResponse {
  url: string;
  statusCode?: number;
}

export class RouterResponseController {
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
    this.applicationRef.render(response, template, result);
  }

  public async transformToResult(resultOrDeferred: any) {
    if (resultOrDeferred && isFunction(resultOrDeferred.subscribe)) {
      return resultOrDeferred.toPromise();
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

  public async sse<TInput>(result: TInput, response: any, request: any) {
    const observable = this.assertObservable(result);

    const stream = new SseStream(request);
    stream.pipe(response);

    const subscription = observable
      .pipe(
        debounce((message: any) => {
          return new Promise(resolve => {
            if (typeof message !== 'object') message = { data: message };
            stream.writeMessage(message, resolve);
          });
        }),
      )
      .subscribe();

    request.on('close', () => {
      response.end();
      subscription.unsubscribe();
    });
  }

  private assertObservable(result: any): Observable<unknown> {
    if (!isFunction(result.subscribe)) {
      throw new ReferenceError(
        'You should use an observable to use server-sent events.',
      );
    }

    return result;
  }
}
