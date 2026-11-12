import {
  BadRequestException,
  type CallHandler,
  type CanActivate,
  Catch,
  ClassSerializerInterceptor,
  Controller,
  type ExceptionFilter,
  type ExecutionContext,
  Get,
  Head,
  Header,
  HttpCode,
  type MiddlewareConsumer,
  Module,
  type NestInterceptor,
  type NestModule,
  NotFoundException,
  Post,
  Req,
  Res,
  StreamableFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { delay, from, map, Observable, of, tap } from 'rxjs';
import { Readable } from 'stream';

const encoder = new TextEncoder();

/**
 * What the handlers report to the spec.
 */
export const streaming = {
  started: 0,
  stopped: 0,
  pulled: 0,
  storeWhenStopped: undefined as string | undefined,
  upstreamUrl: '',
  // Holds a handler back until the spec has seen what it wanted to
  gate: Promise.resolve(),
  openGate: () => {},
  reset() {
    this.started = 0;
    this.stopped = 0;
    this.pulled = 0;
    this.storeWhenStopped = undefined;
    this.gate = new Promise(resolve => (this.openGate = resolve));
  },
};

const requestStore = new AsyncLocalStorage<{ id: string }>();

// What a handler that streams a file named by the client may be asked for
const missingFile = join(tmpdir(), `nest-streaming-missing-${process.pid}`);

function webStream(chunks: (string | Uint8Array)[], failure?: Error) {
  const pending = [...chunks];
  return new ReadableStream({
    // Not all at once: an error discards what is still queued
    pull(controller) {
      const chunk = pending.shift();
      if (chunk !== undefined) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk,
        );
      } else if (failure) {
        controller.error(failure);
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Sends one chunk, then has nothing more to say, as an upstream that went quiet
 * in the middle of an LLM answer.
 */
function quietWebStream(chunks: string[] = []) {
  return new ReadableStream({
    start(controller) {
      streaming.started++;
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
    },
    pull() {
      return new Promise<void>(() => undefined);
    },
    cancel() {
      streaming.stopped++;
      streaming.storeWhenStopped = requestStore.getStore()?.id;
    },
  });
}

async function* endlessGenerator() {
  streaming.started++;
  try {
    for (;;) {
      await new Promise(resolve => setTimeout(resolve, 5));
      yield 'tick ';
    }
  } finally {
    streaming.stopped++;
  }
}

class MarkingGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    (
      context.switchToHttp().getResponse().raw ??
      context.switchToHttp().getResponse()
    ).setHeader('x-guard', 'ran');
    return true;
  }
}

class TeapotError extends Error {}

@Catch(TeapotError)
class TeapotFilter implements ExceptionFilter {
  catch(_err: TeapotError, host: any) {
    const res = host.switchToHttp().getResponse();
    const raw = res.raw ?? res;
    raw.statusCode = 418;
    raw.end('caught by the filter');
    res.hijack?.();
  }
}

class WrappingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => ({ data })));
  }
}

class PlainSerializingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(map(data => JSON.parse(JSON.stringify(data)) as unknown));
  }
}

class TappingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(value => {
        if (value) {
          streaming.pulled = -1;
        }
      }),
    );
  }
}

class PipingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((source: AsyncIterable<string>) =>
        (async function* () {
          for await (const chunk of source) {
            yield chunk.toUpperCase();
          }
        })(),
      ),
    );
  }
}

class CollectingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return from(
      new Promise((resolve, reject) => {
        next.handle().subscribe({
          next: async (source: AsyncIterable<unknown>) => {
            const chunks: string[] = [];
            for await (const chunk of source) {
              chunks.push(
                typeof chunk === 'string'
                  ? chunk
                  : Buffer.from(chunk as Uint8Array).toString(),
              );
            }
            resolve({ collected: chunks.join('') });
          },
          error: reject,
        });
      }),
    );
  }
}

class FileMakingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        map(
          (source: AsyncIterable<string>) =>
            new StreamableFile(Readable.from(source), { type: 'text/csv' }),
        ),
      );
  }
}

class ReplacingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(() => ({ replaced: true })));
  }
}

class DelayingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(delay(20));
  }
}

class ThrowingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(() => {
        throw new BadRequestException('rejected by the interceptor');
      }),
    );
  }
}

@Controller('response')
export class ResponseController {
  @Get()
  plain() {
    return new Response('hello', {
      status: 202,
      headers: { 'x-from-response': 'yes', 'content-type': 'text/x-custom' },
    });
  }

  @Get('promised')
  async promised() {
    return new Response('promised');
  }

  @Get('observable')
  observable() {
    return of(new Response('observed'));
  }

  @Get('stream')
  stream() {
    return new Response(webStream(['from a ', 'stream']));
  }

  @Get('json')
  json() {
    return Response.json({ ok: true }, { status: 400 });
  }

  @Get('cookies')
  cookies() {
    const headers = new Headers();
    headers.append('set-cookie', 'a=1');
    headers.append('set-cookie', 'b=2; Path=/');
    return new Response('cookies', { headers });
  }

  @Get('no-content')
  noContent() {
    return new Response(null, {
      status: 204,
      headers: { 'x-from-response': 'yes' },
    });
  }

  @Get('redirect')
  redirect() {
    return Response.redirect('http://localhost/elsewhere', 307);
  }

  @Get('empty')
  empty() {
    return new Response('', { status: 201 });
  }

  @Get('consumed')
  async consumed() {
    const response = new Response('hello');
    await response.text();
    return response;
  }

  @Get('locked')
  locked() {
    const response = new Response('hello');
    response.body!.getReader();
    return response;
  }

  @Get('network-error')
  networkError() {
    return Response.error();
  }

  @Get('decorated')
  @HttpCode(203)
  @Header('x-decorator', 'kept')
  @Header('x-shared', 'decorator')
  @Header('cache-control', 'no-store')
  decorated() {
    return new Response('decorated', {
      status: 202,
      headers: {
        'x-shared': 'response',
        'x-shared-with-middleware': 'response',
        'content-type': 'text/x-custom',
      },
    });
  }

  @Get('content-type-from-decorator')
  @Header('content-type', 'text/x-decorated')
  contentTypeFromDecorator() {
    return new Response(webStream(['decorated']));
  }

  @Get('guarded')
  @UseGuards(MarkingGuard)
  guarded() {
    return new Response('guarded', { headers: { 'x-from-response': 'yes' } });
  }

  @Post('created')
  created() {
    return new Response('created');
  }

  @Get('fail-first')
  failFirst() {
    return new Response(webStream([], new NotFoundException('not there')), {
      status: 200,
      headers: { 'x-from-response': 'yes' },
    });
  }

  @Get('fail-later')
  failLater() {
    return new Response(webStream(['partial'], new Error('upstream failed')));
  }

  @Get('quiet')
  quiet() {
    return new Response(quietWebStream());
  }

  @Get('endless')
  endless() {
    return new Response(quietWebStream(['some ']));
  }

  @Get('fetched')
  fetched() {
    return fetch(streaming.upstreamUrl);
  }

  @Get('fetched-missing')
  fetchedMissing() {
    return fetch(`${streaming.upstreamUrl}/missing`);
  }

  @Get('sized')
  sized() {
    return new Response(quietWebStream(), {
      headers: { 'content-length': '5', 'content-type': 'text/x-custom' },
    });
  }
}

@Controller('web-stream')
export class WebStreamController {
  @Get()
  bytes() {
    return webStream(['from a ', 'web stream']);
  }

  @Get('strings')
  strings() {
    return new ReadableStream({
      start(controller) {
        controller.enqueue('from ');
        controller.enqueue('strings');
        controller.close();
      },
    });
  }

  @Get('objects')
  objects() {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({ n: 1 });
        controller.enqueue({ n: 2 });
        controller.close();
      },
    });
  }

  @Get('locked')
  locked() {
    const stream = webStream(['hello']);
    stream.getReader();
    return stream;
  }

  @Get('consumed')
  async consumed() {
    const stream = webStream(['hello']);
    for await (const _ of stream as unknown as AsyncIterable<unknown>) {
      // Drained
    }
    return stream;
  }

  @Get('fail-first')
  failFirst() {
    return webStream([], new TeapotError());
  }

  @Get('fail-later')
  failLater() {
    return webStream(['partial'], new Error('upstream failed'));
  }

  @Get('quiet')
  quiet() {
    return quietWebStream();
  }

  @Get('endless')
  endless() {
    return quietWebStream(['some ']);
  }
}

@Controller('generator')
@UseFilters(TeapotFilter)
export class GeneratorController {
  @Get()
  async *strings() {
    yield 'from ';
    yield 'a generator';
  }

  @Get('bytes')
  async *bytes() {
    yield encoder.encode('from ');
    yield new DataView(encoder.encode('bytes').buffer);
    yield encoder.encode(' and buffers').buffer;
  }

  @Get('objects')
  async *objects() {
    yield { n: 1 };
    yield [2];
    yield 3;
    yield null;
    // Nothing to send for these, as in a JSON array or object
    yield undefined;
    yield 'and text';
  }

  @Get('empty')
  async *empty() {
    // Nothing to send
  }

  @Get('flushed')
  async *flushed() {
    yield '';
    await streaming.gate;
    yield 'later';
  }

  @Get('decorated')
  @HttpCode(203)
  @Header('content-type', 'text/x-decorated')
  async *decorated() {
    yield 'decorated';
  }

  @Post('created')
  async *created() {
    yield 'created';
  }

  @Get('iterable')
  iterable() {
    return {
      [Symbol.asyncIterator]() {
        let n = 0;
        return {
          next: async () =>
            n < 2 ? { done: false, value: `${n++}` } : { done: true },
        };
      },
    };
  }

  @Get('fail-first-http')
  async *failFirstHttp() {
    throw new NotFoundException('not there');
  }

  @Get('fail-first-filtered')
  async *failFirstFiltered() {
    throw new TeapotError();
  }

  @Get('fail-first-unknown')
  async *failFirstUnknown() {
    throw new Error('private details');
  }

  @Get('fail-later')
  async *failLater() {
    yield 'partial';
    await new Promise(resolve => setTimeout(resolve, 10));
    throw new Error('upstream failed');
  }

  @Get('fail-right-after-first')
  async *failRightAfterFirst() {
    yield 'partial';
    throw new Error('upstream failed');
  }

  @Get('unserializable-first')
  async *unserializableFirst() {
    try {
      yield 1n;
    } finally {
      streaming.stopped++;
    }
  }

  @Get('unserializable-later')
  async *unserializableLater() {
    try {
      yield { n: 1 };
      yield 1n;
    } finally {
      streaming.stopped++;
    }
  }

  @Get('endless')
  endless() {
    return endlessGenerator();
  }

  @Get('slow-start')
  async *slowStart(@Req() req: any) {
    streaming.started++;
    try {
      // Still waiting for its first chunk when the client leaves
      await new Promise(resolve =>
        (req.raw ?? req).socket.once('close', resolve),
      );
      yield 'too late';
      streaming.pulled++;
    } finally {
      streaming.stopped++;
    }
  }

  @Get('big')
  async *big() {
    const chunk = Buffer.alloc(1024 * 1024, 'x');
    try {
      for (;;) {
        streaming.pulled++;
        yield chunk;
      }
    } finally {
      streaming.stopped++;
      streaming.storeWhenStopped = requestStore.getStore()?.id;
    }
  }

  @Get('context')
  async *context() {
    // Bigger than a stream's buffer, so that each read follows a "drain"
    const chunk = Buffer.alloc(256 * 1024, 'x');
    const seen = new Set<string | undefined>();
    for (let i = 0; i < 20; i++) {
      streaming.pulled++;
      seen.add(requestStore.getStore()?.id);
      yield chunk;
    }
    seen.add(requestStore.getStore()?.id);
    yield `\n${JSON.stringify([...seen])}`;
  }

  @Head('head-only')
  async *headOnly() {
    streaming.started++;
    yield 'never read';
  }
}

@Controller('node-stream')
export class NodeStreamController {
  @Get()
  strings() {
    return Readable.from(['from ', 'a node stream']);
  }

  @Get('bytes')
  bytes() {
    return Readable.from([Buffer.from('from bytes')], { objectMode: false });
  }

  @Get('objects')
  objects() {
    return Readable.from([{ n: 1 }, { n: 2 }]);
  }

  @Get('read')
  async read() {
    const stream = Readable.from(['one', 'two']);
    await new Promise(resolve => stream.once('readable', resolve));
    stream.read();
    return stream;
  }

  @Get('fail-first')
  failFirst() {
    return new Readable({
      read() {
        this.destroy(new NotFoundException('not there'));
      },
    });
  }

  @Get('fail-later')
  failLater() {
    let n = 0;
    return new Readable({
      read() {
        if (n++ === 0) {
          this.push('partial');
        } else {
          setTimeout(() => this.destroy(new Error('upstream failed')), 10);
        }
      },
    });
  }

  @Get('quiet')
  quiet() {
    streaming.started++;
    return new Readable({
      read() {
        // Has nothing to say
      },
      destroy(err, callback) {
        streaming.stopped++;
        callback(err);
      },
    });
  }

  @Get('fails-while-intercepted')
  @UseInterceptors(DelayingInterceptor)
  failsWhileIntercepted() {
    const stream = new Readable({ read() {} });
    setTimeout(() => stream.destroy(new NotFoundException('gone')), 5);
    return stream;
  }

  @Get('missing-file')
  missingFile() {
    return createReadStream(missingFile);
  }

  @Get('missing-file/observed')
  observedMissingFile() {
    // Completes once the stream has failed
    return new Observable(subscriber => {
      subscriber.next(createReadStream(missingFile));
      const timer = setTimeout(() => subscriber.complete(), 20);
      return () => clearTimeout(timer);
    });
  }

  @Get('missing-file/promised-observable')
  @UseInterceptors(DelayingInterceptor)
  async promisedObservableMissingFile() {
    return of(createReadStream(missingFile));
  }

  @Get('missing-file/gated')
  async gatedMissingFile() {
    streaming.started++;
    await streaming.gate;
    return createReadStream(missingFile);
  }
}

@Controller('intercepted')
export class InterceptedController {
  @Get('wrapped/generator')
  @UseInterceptors(WrappingInterceptor)
  async *wrappedGenerator() {
    yield 'from a ';
    yield 'generator';
  }

  @Get('wrapped/web-stream')
  @UseInterceptors(WrappingInterceptor)
  wrappedWebStream() {
    return webStream(['from a ', 'web stream']);
  }

  @Get('wrapped/response')
  @UseInterceptors(WrappingInterceptor)
  wrappedResponse() {
    return new Response('from a response', {
      status: 202,
      headers: { 'x-from-response': 'yes' },
    });
  }

  @Get('wrapped/promised-response')
  @UseInterceptors(WrappingInterceptor)
  async wrappedPromisedResponse() {
    return new Response('promised');
  }

  @Get('wrapped/observable-response')
  @UseInterceptors(WrappingInterceptor)
  wrappedObservableResponse() {
    return of(new Response('observed'));
  }

  @Get('wrapped/node-stream')
  @UseInterceptors(WrappingInterceptor)
  wrappedNodeStream() {
    return Readable.from(['from a ', 'node stream']);
  }

  @Get('wrapped/json')
  @UseInterceptors(WrappingInterceptor)
  wrappedJson() {
    return { n: 1 };
  }

  @Get('plain-serialized/generator')
  @UseInterceptors(PlainSerializingInterceptor)
  async *plainSerializedGenerator() {
    yield 'from a generator';
  }

  @Get('plain-serialized/response')
  @UseInterceptors(PlainSerializingInterceptor)
  plainSerializedResponse() {
    return new Response('from a response');
  }

  @Get('class-serialized/generator')
  @UseInterceptors(ClassSerializerInterceptor)
  async *classSerializedGenerator() {
    yield 'from a generator';
  }

  @Get('class-serialized/response')
  @UseInterceptors(ClassSerializerInterceptor)
  classSerializedResponse() {
    return new Response('from a response');
  }

  @Get('class-serialized/node-stream')
  @UseInterceptors(ClassSerializerInterceptor)
  classSerializedNodeStream() {
    return Readable.from(['from a node stream']);
  }

  @Get('tapped')
  @UseInterceptors(TappingInterceptor)
  async *tapped() {
    yield 'tapped';
  }

  @Get('piped')
  @UseInterceptors(PipingInterceptor)
  async *piped() {
    yield 'piped';
  }

  @Get('wrapped/piped')
  @UseInterceptors(WrappingInterceptor, PipingInterceptor)
  async *wrappedPiped() {
    yield 'piped';
  }

  @Get('piped/quiet')
  @UseInterceptors(PipingInterceptor)
  pipedQuiet() {
    return quietWebStream();
  }

  @Get('replaced')
  @UseInterceptors(ReplacingInterceptor)
  replaced() {
    return quietWebStream(['from the handler']);
  }

  @Get('collected/empty')
  @UseInterceptors(CollectingInterceptor)
  async *collectedEmpty() {
    // Nothing to collect
  }

  @Get('collected/generator')
  @UseInterceptors(CollectingInterceptor)
  async *collectedGenerator() {
    yield 'from a ';
    yield 'generator';
  }

  @Get('collected/web-stream')
  @UseInterceptors(CollectingInterceptor)
  collectedWebStream() {
    return webStream(['from a ', 'web stream']);
  }

  @Get('file')
  @UseInterceptors(FileMakingInterceptor)
  async *file() {
    yield 'a,b';
  }

  @Get('rejected')
  @UseInterceptors(ThrowingInterceptor)
  rejected() {
    return quietWebStream();
  }

  @Get('wrapped/empty')
  @UseInterceptors(WrappingInterceptor)
  async *wrappedEmpty() {
    // Nothing to send
  }

  // A Readable keeps its state, and what it reads from, in plain properties
  @Get('wrapped/empty-node-stream')
  @UseInterceptors(WrappingInterceptor)
  wrappedEmptyNodeStream() {
    return Object.assign(Readable.from([]), { path: '/srv/private/file' });
  }

  @Get('wrapped/empty-response')
  @UseInterceptors(WrappingInterceptor)
  wrappedEmptyResponse() {
    return new Response(new ReadableStream({ start: c => c.close() }), {
      status: 401,
      headers: { 'www-authenticate': 'Bearer' },
    });
  }

  @Get('wrapped/endless')
  @UseInterceptors(WrappingInterceptor)
  wrappedEndless() {
    return endlessGenerator();
  }
}

@Controller('manual')
export class ManualController {
  @Get('res')
  handled(@Res() res: any) {
    res.send('sent by hand');
    return quietWebStream();
  }

  @Get('passthrough')
  async *passthrough(@Res({ passthrough: true }) res: any) {
    (res.raw ?? res).setHeader('x-by-hand', 'yes');
    yield 'passed through';
  }
}

@Controller('compatible')
export class CompatibleController {
  @Get('array')
  array() {
    return [1, 2];
  }

  @Get('set')
  set() {
    return new Set([1, 2]);
  }

  @Get('sync-iterable')
  syncIterable() {
    return {
      name: 'iterable',
      *[Symbol.iterator]() {
        yield 1;
      },
    };
  }

  @Get('thenable')
  thenable() {
    // What a Mongoose query looks like
    return {
      then(onFulfilled: (value: unknown) => void) {
        onFulfilled({ docs: [1, 2] });
      },
      async *[Symbol.asyncIterator]() {
        yield 'streamed by mistake';
      },
    };
  }

  @Get('thenable-intercepted')
  @UseInterceptors(WrappingInterceptor)
  thenableIntercepted() {
    return {
      then(onFulfilled: (value: unknown) => void) {
        onFulfilled({ docs: [1, 2] });
      },
      async *[Symbol.asyncIterator]() {
        yield 'streamed by mistake';
      },
    };
  }

  @Get('observable')
  observable() {
    return of(1, 2, 3);
  }

  @Get('observable-of-thenable')
  observableOfThenable() {
    return of({
      docs: [1],
      then: 'not a function',
    });
  }

  @Get('from-generator')
  fromGenerator() {
    return from(
      (async function* () {
        yield 1;
        yield 2;
      })(),
    );
  }
}

@Module({
  controllers: [
    ResponseController,
    WebStreamController,
    GeneratorController,
    NodeStreamController,
    InterceptedController,
    ManualController,
    CompatibleController,
  ],
})
export class StreamingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        const raw = res.raw ?? res;
        raw.setHeader('x-middleware', 'ran');
        raw.setHeader('x-shared-with-middleware', 'middleware');
        raw.setHeader('set-cookie', 'from=middleware');
        requestStore.run(
          { id: req.headers['x-request-id'] ?? 'request' },
          next,
        );
      })
      .forRoutes('{*path}');
  }
}
