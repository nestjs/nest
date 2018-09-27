import { Inject, Injectable, Utils } from '@nest/core';
import { Observable } from 'rxjs';

import { HttpServer } from '../interfaces';
import { HttpStatus, RequestMethod } from '../enums';
import { HTTP_SERVER } from '../tokens';

export type ResultOrDeferred<T> = T | Promise<T> | Observable<T>;

export interface CustomHeader {
  name: string;
  value: string;
}

@Injectable()
export class RouterResponseController {
  @Inject(HTTP_SERVER)
  private readonly httpServer: HttpServer;

  public async apply(
    resultOrDeferred: ResultOrDeferred<any>,
    response: any,
    httpStatusCode: number,
  ) {
    const result = await Utils.transformResult(resultOrDeferred);
    return this.httpServer.reply(response, result, httpStatusCode);
  }

  public async render(
    resultOrDeferred: ResultOrDeferred<any>,
    response: any,
    template: string,
  ) {
    const result = await Utils.transformResult(resultOrDeferred);
    this.httpServer.render(response, template, result);
  }

  public getStatusByMethod(requestMethod: keyof RequestMethod) {
    switch (requestMethod) {
      case RequestMethod.POST:
        return HttpStatus.CREATED;
      default:
        return HttpStatus.OK;
    }
  }

  public setHeaders(response: any, headers: CustomHeader[]) {
    headers.forEach(({ name, value }) => {
      this.httpServer.setHeader(response, name, value);
    });
  }
}
