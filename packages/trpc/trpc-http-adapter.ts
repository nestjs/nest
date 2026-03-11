import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  fetchRequestHandler,
  FetchHandlerRequestOptions,
} from '@trpc/server/adapters/fetch';
import { Readable } from 'stream';
import { TRPC_MODULE_OPTIONS } from './constants';
import { TrpcModuleOptions } from './interfaces';
import { TrpcRouter } from './trpc-router';
import { trpcRequestStorage } from './trpc-request-storage';

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
      trpcRequestStorage.run({ req, res }, () => {
        void this.createFetchRequest(req)
          .then((fetchRequest: Request) => {
            const handlerOpts: FetchHandlerRequestOptions<any> = {
              router,
              req: fetchRequest,
              endpoint: path.replace(/^\//, ''),
              createContext: createContext
                ? () => createContext({ req, res })
                : undefined,
            };
            return fetchRequestHandler(handlerOpts);
          })
          .then((fetchResponse: Response) => {
            this.sendFetchResponse(req, res, fetchResponse);
          })
          .catch((error: unknown) => {
            this.logger.error('Unhandled tRPC adapter error', error as any);
            res.statusCode = 500;
            this.sendBody(
              res,
              JSON.stringify({
                error: { message: 'Internal server error', code: -32603 },
              }),
            );
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
      instance.route({ method: 'GET', url: `${path}/*`, handler });
      instance.route({ method: 'POST', url: `${path}/*`, handler });
      this.logger.log(`Mapped tRPC handler to "${path}" (Fastify)`);
    }
  }

  private sendFetchResponse(req: any, res: any, fetchResponse: Response) {
    res.statusCode = fetchResponse.status;
    fetchResponse.headers.forEach((value: string, key: string) => {
      this.setHeader(res, key, value);
    });

    const body = fetchResponse.body;
    if (body && this.isStreamingResponse(fetchResponse)) {
      this.pipeWebStreamToResponse(req, res, body);
      return;
    }

    void fetchResponse.text().then((textBody: string) => {
      this.sendBody(res, textBody);
    });
  }

  private async createFetchRequest(req: any): Promise<Request> {
    // Build a URL from the request.
    const protocol =
      req.protocol ?? (req.raw?.socket?.encrypted ? 'https' : 'http');
    const host = req.hostname ?? req.headers?.host ?? 'localhost';
    const url = `${protocol}://${host}${req.originalUrl ?? req.url}`;
    const body =
      req.method !== 'GET' && req.method !== 'HEAD'
        ? await this.resolveBody(req)
        : undefined;

    return new Request(url, {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body,
    });
  }

  private async resolveBody(req: any): Promise<any> {
    const serialized = this.serializeBody(req.body);
    if (serialized !== undefined) {
      return serialized;
    }

    const rawSerialized = this.serializeBody(req.raw?.body);
    if (rawSerialized !== undefined) {
      return rawSerialized;
    }

    const streamSource = req.raw ?? req;
    if (!streamSource || typeof streamSource.on !== 'function') {
      return undefined;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of streamSource as AsyncIterable<Buffer | string>) {
      chunks.push(
        typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk,
      );
    }

    if (!chunks.length) {
      return undefined;
    }

    return Buffer.concat(chunks).toString('utf-8');
  }

  private serializeBody(body: unknown): any {
    if (body == null) {
      return undefined;
    }
    if (typeof body === 'string') {
      return body;
    }
    if (Buffer.isBuffer(body)) {
      return body as any;
    }
    if (ArrayBuffer.isView(body)) {
      return body as any;
    }
    return JSON.stringify(body);
  }

  private setHeader(res: any, key: string, value: string) {
    res.setHeader?.(key, value) ??
      res.header?.(key, value) ??
      res.raw?.setHeader?.(key, value);
  }

  private sendBody(res: any, body: string) {
    if (res.send) {
      res.send(body);
      return;
    }
    if (res.end) {
      res.end(body);
      return;
    }
    res.raw?.end(body);
  }

  private endResponse(res: any) {
    if (res.end) {
      res.end();
      return;
    }
    res.raw?.end?.();
  }

  private isStreamingResponse(fetchResponse: Response): boolean {
    const contentType = fetchResponse.headers.get('content-type') ?? '';
    return contentType.includes('text/event-stream');
  }

  private pipeWebStreamToResponse(
    req: any,
    res: any,
    body: ReadableStream<Uint8Array>,
  ) {
    const nodeStream = Readable.fromWeb(body as any);

    req.on?.('close', () => {
      nodeStream.destroy();
    });

    nodeStream.on('data', (chunk: Buffer | Uint8Array | string) => {
      if (res.write) {
        res.write(chunk);
        return;
      }
      if (res.raw?.write) {
        res.raw.write(chunk);
        return;
      }
      this.sendBody(res, Buffer.from(chunk as any).toString('utf-8'));
    });
    nodeStream.on('end', () => {
      this.endResponse(res);
    });
    nodeStream.on('error', () => {
      this.endResponse(res);
    });
  }
}
