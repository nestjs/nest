import { RequestMethod, HttpStatus, HttpServer } from '@nestjs/common';
import { isNil, isObject, isFunction } from '@nestjs/common/utils/shared.utils';

export class RouterResponseController {
  constructor(private readonly applicationRef: HttpServer) {}

  public async apply(resultOrDeffered, response, httpStatusCode: number) {
    const result = await this.transformToResult(resultOrDeffered);
    return this.applicationRef.reply(response, result, httpStatusCode);
  }

  public async render(resultOrDeffered, response, template: string) {
    const result = await this.transformToResult(resultOrDeffered);
    this.applicationRef.render(response, template, result);
  }

  public async transformToResult(resultOrDeffered) {
    if (resultOrDeffered instanceof Promise) {
      return await resultOrDeffered;
    } else if (resultOrDeffered && isFunction(resultOrDeffered.subscribe)) {
      return await resultOrDeffered.toPromise();
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
}
