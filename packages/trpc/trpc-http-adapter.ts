import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  fetchRequestHandler,
  FetchHandlerRequestOptions,
} from '@trpc/server/adapters/fetch';
import { TRPC_MODULE_OPTIONS } from './constants';
import { TrpcModuleOptions } from './interfaces';
import { TrpcRouter } from './trpc-router';

/**
 * Registers the tRPC HTTP handler on the underlying HTTP adapter.
 *
 * Supports both Express and Fastify via the generic Fetch adapter,
 * falling back to a manual middleware when needed.
 */
@Injectable()
export class TrpcHttpAdapter implements OnModuleInit {
  private readonly logger = new Logger(TrpcHttpAdapter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly trpcRouter: TrpcRouter,
    @Inject(TRPC_MODULE_OPTIONS)
    private readonly options: TrpcModuleOptions,
  ) {}

  onModuleInit() {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    if (!httpAdapter) {
      return;
    }

    const path = this.options.path ?? '/trpc';
    const router = this.trpcRouter.getRouter();
    const createContext = this.options.createContext;

    const handler = (req: any, res: any) => {
      // Build a URL from the request
      const protocol =
        req.protocol ?? (req.raw?.socket?.encrypted ? 'https' : 'http');
      const host = req.hostname ?? req.headers?.host ?? 'localhost';
      const url = `${protocol}://${host}${req.originalUrl ?? req.url}`;

      const fetchRequest = new Request(url, {
        method: req.method,
        headers: new Headers(req.headers as Record<string, string>),
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? JSON.stringify(req.body)
            : undefined,
      });

      const handlerOpts: FetchHandlerRequestOptions<any> = {
        router,
        req: fetchRequest,
        endpoint: path.replace(/^\//, ''),
        createContext: createContext
          ? () => createContext({ req, res })
          : undefined,
      };

      void fetchRequestHandler(handlerOpts).then((fetchResponse: Response) => {
        res.statusCode = fetchResponse.status;
        fetchResponse.headers.forEach((value: string, key: string) => {
          res.setHeader?.(key, value) ??
            res.header?.(key, value) ??
            res.raw?.setHeader?.(key, value);
        });

        void fetchResponse.text().then((body: string) => {
          if (res.send) {
            res.send(body);
          } else if (res.end) {
            res.end(body);
          } else {
            res.raw?.end(body);
          }
        });
      });
    };

    // Register for all HTTP methods on the tRPC path
    const instance = httpAdapter.getInstance();

    // Use the underlying framework's routing
    // Express: app.use(path, handler)
    if (typeof instance.use === 'function') {
      instance.use(path, handler);
      this.logger.log(`Mapped tRPC handler to "${path}" (Express)`);
    }
    // Fastify: app.all(path, handler)
    else if (typeof instance.route === 'function') {
      instance.route({
        method: ['GET', 'POST'],
        url: `${path}/*`,
        handler,
      });
      this.logger.log(`Mapped tRPC handler to "${path}" (Fastify)`);
    }
  }
}
