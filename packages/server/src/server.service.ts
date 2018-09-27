import { Inject, Injectable, Injector, Type, Utils } from '@nest/core';
import * as https from 'https';
import * as http from 'http';

import {
  HttpServer,
  HttpServerOptions,
  ServerFeatureOptions,
} from './interfaces';
import { HTTP_SERVER, HTTP_SERVER_OPTIONS } from './tokens';
import { Middleware } from './middleware';
import { RoutesResolver } from './router';

@Injectable()
export class ServerService {
  // private readonly controllers = new Set<Type<any>>();
  private httpServer: http.Server | https.Server;

  @Inject(HTTP_SERVER_OPTIONS)
  private readonly options: HttpServerOptions;

  @Inject(HTTP_SERVER)
  private readonly httpAdapter: HttpServer;

  constructor(
    private readonly routesResolver: RoutesResolver,
    private readonly middleware: Middleware,
    private readonly injector: Injector,
  ) {}

  // Resolve once feature module has been initialized
  // which means every controller and configuration middleware will be available
  public async resolve(
    controllers: Type<any>[],
    options: ServerFeatureOptions,
  ) {
    await this.middleware.resolveMiddleware(
      controllers,
      options,
      this.injector,
    );

    this.routesResolver.resolve(controllers, options);

    /*controllers.forEach(ref => {
      const configuration = this.injector.get(options.configure);
      const controller = this.injector.get(ref);
      // this.controllers.add(ref);
    });*/
  }

  public async registerMiddleware() {
    await this.middleware.register();
  }

  public async registerRouterHandlers() {
    this.routesResolver.registerNotFoundHandler();
    this.routesResolver.registerExceptionHandler();
  }

  public registerHttpServer() {
    this.httpServer = this.httpAdapter.create();
  }

  public async listen() {
    await Utils.promisify(this.httpAdapter.listen)(
      this.options.port,
      this.options.hostname,
    );
  }

  // Fires once entire application has initialized
  public async start() {
    try {
      this.registerHttpServer();
      await this.registerMiddleware();
      await this.registerRouterHandlers();
      await this.listen();
    } catch (e) {}
  }
}
