import { Inject, Injectable } from '@nest/core';

import { HTTP_SERVER } from '../tokens';
import { RequestMethod } from '../enums';
import { HttpServer } from '../interfaces';

@Injectable()
export class RouterMethodFactory {
  @Inject(HTTP_SERVER)
  private readonly httpServer: HttpServer;

  public get(requestMethod: keyof RequestMethod) {
    const getCallback = () => {
      switch (requestMethod) {
        case RequestMethod.POST:
          return this.httpServer.post;
        case RequestMethod.ALL:
          return this.httpServer.use;
        case RequestMethod.DELETE:
          return this.httpServer.delete;
        case RequestMethod.PUT:
          return this.httpServer.put;
        case RequestMethod.PATCH:
          return this.httpServer.patch;
        case RequestMethod.OPTIONS:
          return this.httpServer.options;
        case RequestMethod.HEAD:
          return this.httpServer.head;
        default:
          return this.httpServer.get;
      }
    };

    return getCallback().bind(this.httpServer);
  }
}
