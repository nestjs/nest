import { Inject, Injectable, NestContainer, Type } from '@nest/core';

import { HttpServer, ServerFeatureOptions } from '../interfaces';
import { RouterBuilder } from './router-builder.service';
import { RouterProxy } from './router-proxy.service';
import { BadRequestException } from '../errors';
import { HTTP_SERVER } from '../tokens';
import { CONTROLLER_MAPPING_MESSAGE } from '@nest/server';

@Injectable()
export class RoutesResolver {
  @Inject(HTTP_SERVER)
  private readonly httpServer: HttpServer;

  constructor(
    private readonly container: NestContainer,
    private readonly routerBuilder: RouterBuilder,
    private readonly routerProxy: RouterProxy,
  ) {}

  public resolve(controllers: Type<any>[], options: ServerFeatureOptions) {
    controllers.forEach(controller => this.registerRouter(controller, options));
  }

  private registerRouter(controller: Type<any>, options: ServerFeatureOptions) {
    const path = this.routerBuilder.extractRouterPath(
      controller,
      options.prefix,
    );

    console.log(CONTROLLER_MAPPING_MESSAGE(controller.name, path));

    this.routerBuilder.explore(controller, path);
  }

  public registerNotFoundHandler() {
    this.httpServer.setNotFoundHandler((req: any) => {
      const method = this.httpServer.getRequestMethod(req);
      const url = this.httpServer.getRequestUrl(req);
      throw new Error(`Cannot ${method} ${url}`);
    });
  }

  public registerExceptionHandler() {
    this.httpServer.setErrorHandler((err: any) => {
      throw this.mapExternalException(err);
    });
  }

  private mapExternalException(err: any) {
    switch (true) {
      case err instanceof SyntaxError:
        return new BadRequestException((<SyntaxError>err).message);
      default:
        return err;
    }
  }
}
