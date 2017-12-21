import 'rxjs/add/operator/toPromise';

import { HttpStatus, RequestMethod } from '@nestjs/common';
import { isFunction, isNil, isObject } from '@nestjs/common/utils/shared.utils';

import { Observable } from 'rxjs/Observable';
import { Response } from 'express-serve-static-core';

export class RouterResponseController {
  public async apply(resultOrDeffered: Promise<any> | Observable<any>, response: Response, requestMethod: RequestMethod, httpCode: number) {
    const result = await this.transformToResult(resultOrDeffered);
    const statusCode = httpCode ? httpCode : this.getStatusByMethod(requestMethod);
    const res = response.status(statusCode);
    if (isNil(result)) {
      return res.send();
    }
    return isObject(result) ? res.json(result) : res.send(String(result));
  }

  public async transformToResult<T>(resultOrDeffered: Promise<T> | Observable<T>): Promise<T> {
    if (resultOrDeffered instanceof Promise) {
      return await resultOrDeffered;
    }
    else if (resultOrDeffered && isFunction(resultOrDeffered.subscribe)) {
      return await resultOrDeffered.toPromise();
    }
    return resultOrDeffered as any;
  }

  public getStatusByMethod(requestMethod: RequestMethod): number {
    switch (requestMethod) {
      case RequestMethod.POST: return HttpStatus.CREATED;
      default: return HttpStatus.OK;
    }
  }
}
