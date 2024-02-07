import { HttpServer } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

export class RouterMethodFactory {
  public get(target: HttpServer, requestMethod: RequestMethod): Function {
    switch (requestMethod) {
      case RequestMethod.POST:
        return target.post;
      case RequestMethod.ALL:
        return target.all;
      case RequestMethod.DELETE:
        return target.delete;
      case RequestMethod.PUT:
        return target.put;
      case RequestMethod.PATCH:
        return target.patch;
      case RequestMethod.OPTIONS:
        return target.options;
      case RequestMethod.HEAD:
        return target.head;
      case RequestMethod.GET:
        return target.get;
      case RequestMethod.PROPFIND:
        return target.propfind;
      case RequestMethod.PROPPATCH:
        return target.proppatch;
      case RequestMethod.MKCOL:
        return target.mkcol;
      case RequestMethod.COPY:
        return target.copy;
      case RequestMethod.MOVE:
        return target.move;
      case RequestMethod.LOCK:
        return target.lock;
      case RequestMethod.UNLOCK:
        return target.unlock;
      default: {
        return target.use;
      }
    }
  }
}
