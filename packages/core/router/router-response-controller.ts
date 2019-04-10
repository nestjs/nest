import { HttpServer, HttpStatus, RequestMethod } from '@nestjs/common';
import { isFunction } from '@nestjs/common/utils/shared.utils';

export interface CustomHeader {
  name: string;
  value: string;
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

  public async render<TInput = any, TResponse = any>(
    resultOrDeffered: TInput,
    response: TResponse,
    template: string,
  ) {
    const result = await this.transformToResult(resultOrDeffered);
    this.applicationRef.render(response, template, result);
  }

  public async transformToResult(resultOrDeffered: any) {
    if (resultOrDeffered && isFunction(resultOrDeffered.subscribe)) {
      return resultOrDeffered.toPromise();
    }
    return resultOrDeffered;
  }

  public getStatusByMethod(requestMethod: RequestMethod): number {
    switch (requestMethod) {
      case RequestMethod.POST:
        return HttpStatus.CREATED;
      default:
        return HttpStatus.OK;
    }
  }

  public setHeaders<TResponse = any>(
    response: TResponse,
    headers: CustomHeader[],
  ) {
    headers.forEach(({ name, value }) =>
      this.applicationRef.setHeader(response, name, value),
    );
  }

  public setStatus<TResponse = any>(response: TResponse, statusCode: number) {
    this.applicationRef.status(response, statusCode);
  }
}
