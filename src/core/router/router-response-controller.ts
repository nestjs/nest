import { RequestMethod, HttpStatus } from '@nestjs/common';
import { isNil, isObject, isFunction } from '@nestjs/common/utils/shared.utils';
import 'rxjs/add/operator/toPromise';

export class RouterResponseController {
  public async apply(resultOrDeffered, response, httpStatusCode: number) {
    const result = await this.transformToResult(resultOrDeffered);
    const res = response.status(httpStatusCode);
    if (isNil(result)) {
      return res.send();
    }
    return isObject(result) ? res.json(result) : res.send(result);
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
