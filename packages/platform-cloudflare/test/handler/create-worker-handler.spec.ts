import {
  Controller,
  Get,
  Injectable,
  Module,
  OnModuleInit,
  Sse,
} from '@nestjs/common';
import {
  CloudflareAdapter,
  CloudflareContext,
  CloudflareModule,
  createWorkerHandler,
  getCloudflareContext,
} from '@nestjs/platform-cloudflare';
import type { Server } from 'http';
import inject from 'light-my-request';
import { finalize, interval, map, Observable } from 'rxjs';
import { Readable } from 'stream';

// Outside of workerd, requests are dispatched in-process to the server that
// the adapter listens with, which is what "handleAsNodeRequest()" does in the
// runtime: the request runs in the async context of the caller, with a socket
// that only carries address information and never emits "close"
const servers = vi.hoisted(() => new Map<number, Server>());
vi.mock('cloudflare:node', () => ({
  handleAsNodeRequest: async (port: number, request: Request) => {
    const server = servers.get(port)!;
    const url = new URL(request.url);
    const response = await inject(
      (req, res) => {
        // Express replaces the prototype of the response, which is where
        // light-my-request captures the output
        for (const method of ['writeHead', 'write', 'end'] as const) {
          (res as any)[method] = Object.getPrototypeOf(res)[method];
        }
        // The runtime closes the response when the client disconnects
        request.signal.addEventListener('abort', () => res.destroy(), {
          once: true,
        });
        server.emit('request', req, res);
      },
      {
        method: request.method as any,
        url: url.pathname + url.search,
        headers: Object.fromEntries(request.headers),
        payload: Buffer.from(await request.arrayBuffer()),
        signal: request.signal,
        payloadAsStream: true,
      },
    );
    const headers = new Headers();
    for (const [name, value] of Object.entries(response.headers)) {
      for (const item of ([] as unknown[]).concat(value)) {
        headers.append(name, String(item));
      }
    }
    return new Response(Readable.toWeb(response.stream()) as ReadableStream, {
      status: response.statusCode,
      headers,
    });
  },
}));

interface Env {
  GREETING: string;
}

const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
const env: Env = { GREETING: 'hello' };
const sseFinalized = vi.fn();

@Injectable()
class GreetingService {
  constructor(private readonly cloudflare: CloudflareContext<Env>) {}

  greet() {
    this.cloudflare.waitUntil(Promise.resolve());
    return {
      greeting: this.cloudflare.env.GREETING,
      cf: this.cloudflare.cf ?? null,
    };
  }
}

@Controller()
class AppController {
  constructor(private readonly greetingService: GreetingService) {}

  @Get('greet')
  greet() {
    return this.greetingService.greet();
  }

  @Get('context')
  context() {
    return { greeting: getCloudflareContext<Env>().env.GREETING };
  }

  @Sse('events')
  events(): Observable<unknown> {
    return interval(10).pipe(
      map(i => ({ data: i })),
      finalize(sseFinalized),
    );
  }
}

@Module({
  imports: [CloudflareModule],
  controllers: [AppController],
  providers: [GreetingService],
})
class AppModule {}

describe('createWorkerHandler', () => {
  const handlers: ReturnType<typeof createWorkerHandler<Env>>[] = [];
  const create = (...args: Parameters<typeof createWorkerHandler<Env>>) => {
    const handler = createWorkerHandler<Env>(...args);
    handlers.push(handler);
    return handler;
  };
  const appOptions = { logger: false as const };

  beforeEach(() => {
    const getPort = CloudflareAdapter.prototype.getPort;
    vi.spyOn(CloudflareAdapter.prototype, 'getPort').mockImplementation(
      function (this: CloudflareAdapter) {
        const port = getPort.call(this)!;
        servers.set(port, this.getHttpServer());
        return port;
      },
    );
  });

  afterEach(async () => {
    for (const handler of handlers.splice(0)) {
      const app = await handler.getApp(env, ctx).catch(() => null);
      await app?.close();
    }
    servers.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should serve the application', async () => {
    const handler = create(AppModule, { appOptions });

    const response = await handler.fetch(
      new Request('https://example.com/greet'),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ greeting: 'hello', cf: null });
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('should expose the context of each request', async () => {
    const handler = create(AppModule, { appOptions });

    const [first, second] = await Promise.all([
      handler.fetch(new Request('https://example.com/context'), env, ctx),
      handler.fetch(
        new Request('https://example.com/context'),
        { GREETING: 'bonjour' },
        ctx,
      ),
    ]);

    expect(await first.json()).toEqual({ greeting: 'hello' });
    expect(await second.json()).toEqual({ greeting: 'bonjour' });
  });

  it('should bootstrap once, and configure the application with the bindings', async () => {
    const configure = vi.fn();
    const handler = create(AppModule, { appOptions, configure });

    await Promise.all([
      handler.fetch(new Request('https://example.com/greet'), env, ctx),
      handler.fetch(new Request('https://example.com/greet'), env, ctx),
    ]);
    await handler.fetch(new Request('https://example.com/greet'), env, ctx);

    expect(configure).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledWith(expect.anything(), env);
  });

  it('should apply the configuration', async () => {
    const handler = create(AppModule, {
      appOptions,
      configure: app => {
        app.setGlobalPrefix('api');
      },
    });

    const prefixed = await handler.fetch(
      new Request('https://example.com/api/greet'),
      env,
      ctx,
    );
    const unprefixed = await handler.fetch(
      new Request('https://example.com/greet'),
      env,
      ctx,
    );

    expect(prefixed.status).toBe(200);
    expect(unprefixed.status).toBe(404);
  });

  it('should bootstrap again after a failed bootstrap', async () => {
    let attempts = 0;

    @Injectable()
    class FlakyService implements OnModuleInit {
      onModuleInit() {
        if (++attempts === 1) {
          throw new Error('Unavailable');
        }
      }
    }

    @Module({ imports: [AppModule], providers: [FlakyService] })
    class FlakyModule {}

    const handler = create(FlakyModule, { appOptions });

    await expect(
      handler.fetch(new Request('https://example.com/greet'), env, ctx),
    ).rejects.toThrow('Unavailable');
    const response = await handler.fetch(
      new Request('https://example.com/greet'),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it('should return the application', async () => {
    const handler = create(AppModule, { appOptions });

    const app = await handler.getApp(env, ctx);

    expect(app.get(GreetingService)).toBeInstanceOf(GreetingService);
    expect(await handler.getApp(env, ctx)).toBe(app);
  });

  it('should stop a Server-Sent Events stream when the client goes away', async () => {
    const handler = create(AppModule, { appOptions });
    const abortController = new AbortController();

    const response = await handler.fetch(
      new Request('https://example.com/events', {
        signal: abortController.signal,
      }),
      env,
      ctx,
    );
    const reader = response.body!.getReader();
    let received = '';
    while (!received.includes('data: 0')) {
      const { value } = await reader.read();
      received += new TextDecoder().decode(value);
    }
    expect(sseFinalized).not.toHaveBeenCalled();
    abortController.abort();

    await vi.waitFor(() => expect(sseFinalized).toHaveBeenCalledTimes(1));
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('should only expose the context while handling a request', () => {
    expect(() => getCloudflareContext()).toThrow(
      'The Cloudflare context is only available while handling a request',
    );
  });
});
