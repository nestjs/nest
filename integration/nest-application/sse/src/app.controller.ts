import {
  Body,
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  MessageEvent,
  NestInterceptor,
  Post,
  Query,
  Req,
  RequestMethod,
  Sse,
  SseSignal,
  UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { IncomingMessage } from 'node:http';
import { EMPTY, interval, map, Observable, of } from 'rxjs';

class SseQueryDto {
  @Type(() => Number)
  @IsInt()
  limit!: number;
}

@Injectable()
class PassthroughInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle();
  }
}

@Controller()
export class AppController {
  private promiseDelayedRequestsStarted = 0;
  private promiseDelayedSubscriptionsStarted = 0;
  private promiseDelayedCloseEventsObserved = 0;
  private promiseDelayedTeardownsObserved = 0;
  private promiseDelayedRunningStreams = 0;
  private readonly promiseDelayedResolvers: Array<() => void> = [];

  private interceptorDelayedRequestsStarted = 0;
  private interceptorDelayedSubscriptionsStarted = 0;
  private interceptorDelayedCloseEventsObserved = 0;
  private interceptorDelayedTeardownsObserved = 0;
  private interceptorDelayedRunningStreams = 0;
  private readonly interceptorDelayedResolvers: Array<() => void> = [];

  private signalRequestsStarted = 0;
  private signalResourcesAllocated = 0;
  private signalResourcesCleaned = 0;
  private signalSubscriptionsStarted = 0;

  private completingSubscriptionsStarted = 0;
  private completingAbortsObserved = 0;
  private completingTeardownsObserved = 0;

  private streamingSubscriptionsStarted = 0;
  private streamingAbortsObserved = 0;
  private streamingTeardownsObserved = 0;

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map(() => ({ data: { hello: 'world' } }) as MessageEvent),
    );
  }

  @Sse('sse/validated')
  sseWithValidatedQuery(@Query() query: SseQueryDto): Observable<MessageEvent> {
    return of({ data: { limit: query.limit } });
  }

  @Sse('sse/burst')
  sseBurst(
    @Query('n') n = '20',
    @Query('size') size = '65536',
  ): Observable<MessageEvent> {
    const count = parseInt(n, 10);
    const payload = 'X'.repeat(parseInt(size, 10));

    return new Observable(subscriber => {
      for (let i = 0; i < count; i++) {
        subscriber.next({ data: payload });
      }
      subscriber.complete();
    });
  }

  @Sse('sse/post', { method: RequestMethod.POST })
  ssePost(@Body() body: { content?: string }): Observable<MessageEvent> {
    return of({ data: { content: body.content ?? 'default' } });
  }

  @Sse('sse/promise-delayed')
  ssePromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    return this.createPromiseDelayedSse(request);
  }

  @Sse('sse/post/promise-delayed', { method: RequestMethod.POST })
  ssePostPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
    @Body() _body: { content?: string },
  ): Promise<Observable<MessageEvent>> {
    return this.createPromiseDelayedSse(request);
  }

  private createPromiseDelayedSse(
    request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    this.promiseDelayedRequestsStarted += 1;
    this.promiseDelayedRunningStreams += 1;
    const rawRequest = request.socket ?? request;

    let subscribed = false;
    let released = false;
    const releaseStream = () => {
      if (released) {
        return;
      }
      released = true;
      this.promiseDelayedRunningStreams -= 1;
    };

    rawRequest.once('close', () => {
      this.promiseDelayedCloseEventsObserved += 1;

      // When the client disconnects before the promise resolves, the producer
      // Observable is never subscribed, so its teardown never runs. Release the
      // stream slot here instead — otherwise it would leak in the stats.
      if (!subscribed) {
        releaseStream();
      }
    });

    return new Promise(resolve => {
      this.promiseDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            subscribed = true;
            this.promiseDelayedSubscriptionsStarted += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.promiseDelayedTeardownsObserved += 1;
              releaseStream();
            };
          }),
        ),
      );
    });
  }

  @Post('sse/promise-delayed/release')
  releaseSsePromiseDelayed() {
    const pendingResolvers = this.promiseDelayedResolvers.splice(0);
    pendingResolvers.forEach(resolve => resolve());

    return {
      released: pendingResolvers.length,
    };
  }

  @Get('sse/promise-delayed/stats')
  getSsePromiseDelayedStats() {
    return {
      closeEventsObserved: this.promiseDelayedCloseEventsObserved,
      requestsStarted: this.promiseDelayedRequestsStarted,
      runningStreams: this.promiseDelayedRunningStreams,
      subscriptionsStarted: this.promiseDelayedSubscriptionsStarted,
      teardownsObserved: this.promiseDelayedTeardownsObserved,
    };
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/interceptor/promise-delayed')
  sseInterceptorPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    return this.createInterceptorDelayedSse(request);
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/post/interceptor/promise-delayed', { method: RequestMethod.POST })
  ssePostInterceptorPromiseDelayed(
    @Req() request: IncomingMessage & { raw?: IncomingMessage },
    @Body() _body: { content?: string },
  ): Promise<Observable<MessageEvent>> {
    return this.createInterceptorDelayedSse(request);
  }

  private createInterceptorDelayedSse(
    request: IncomingMessage & { raw?: IncomingMessage },
  ): Promise<Observable<MessageEvent>> {
    this.interceptorDelayedRequestsStarted += 1;
    this.interceptorDelayedRunningStreams += 1;
    const rawRequest = request.socket ?? request;

    let subscribed = false;
    let released = false;
    const releaseStream = () => {
      if (released) {
        return;
      }
      released = true;
      this.interceptorDelayedRunningStreams -= 1;
    };

    rawRequest.once('close', () => {
      this.interceptorDelayedCloseEventsObserved += 1;

      // When the client disconnects before the promise resolves, the producer
      // Observable is never subscribed, so its teardown never runs. Release the
      // stream slot here instead — otherwise it would leak in the stats.
      if (!subscribed) {
        releaseStream();
      }
    });

    return new Promise(resolve => {
      this.interceptorDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            subscribed = true;
            this.interceptorDelayedSubscriptionsStarted += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.interceptorDelayedTeardownsObserved += 1;
              releaseStream();
            };
          }),
        ),
      );
    });
  }

  @Post('sse/interceptor/promise-delayed/release')
  releaseInterceptorDelayedSse() {
    const pendingResolvers = this.interceptorDelayedResolvers.splice(0);
    pendingResolvers.forEach(resolve => resolve());

    return {
      released: pendingResolvers.length,
    };
  }

  @Get('sse/interceptor/promise-delayed/stats')
  getInterceptorDelayedSseStats() {
    return {
      closeEventsObserved: this.interceptorDelayedCloseEventsObserved,
      requestsStarted: this.interceptorDelayedRequestsStarted,
      runningStreams: this.interceptorDelayedRunningStreams,
      subscriptionsStarted: this.interceptorDelayedSubscriptionsStarted,
      teardownsObserved: this.interceptorDelayedTeardownsObserved,
    };
  }

  @UseInterceptors(PassthroughInterceptor)
  @Sse('sse/signal/promise-delayed')
  async sseSignalPromiseDelayed(
    @SseSignal() signal: AbortSignal,
  ): Promise<Observable<MessageEvent>> {
    this.signalRequestsStarted += 1;

    // Simulate an expensive async setup that allocates a resource (e.g. an LLM
    // session, a DB cursor) before the producer Observable exists.
    const resource = { closed: false };
    this.signalResourcesAllocated += 1;

    await new Promise(resolve => setTimeout(resolve, 80));

    if (signal.aborted) {
      // The client disconnected during setup: clean up the resource ourselves
      // because the producer Observable below will never be subscribed.
      resource.closed = true;
      this.signalResourcesCleaned += 1;
      return EMPTY;
    }

    return new Observable<MessageEvent>(subscriber => {
      this.signalSubscriptionsStarted += 1;
      const intervalId = setInterval(() => {
        subscriber.next({ data: { hello: 'world' } });
      }, 50);
      const onAbort = () => subscriber.complete();
      signal.addEventListener('abort', onAbort, { once: true });

      return () => {
        clearInterval(intervalId);
        signal.removeEventListener('abort', onAbort);
        resource.closed = true;
        this.signalResourcesCleaned += 1;
      };
    });
  }

  // A stream that runs to completion without the client ever disconnecting. The
  // signal is a request-lifetime token, so it aborts once the stream ends.
  @Sse('sse/signal/completing')
  sseSignalCompleting(
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    signal.addEventListener(
      'abort',
      () => {
        this.completingAbortsObserved += 1;
      },
      { once: true },
    );

    return new Observable<MessageEvent>(subscriber => {
      this.completingSubscriptionsStarted += 1;

      subscriber.next({ data: { chunk: 0 } });
      subscriber.next({ data: { chunk: 1 } });
      subscriber.complete();

      return () => {
        this.completingTeardownsObserved += 1;
      };
    });
  }

  @Get('sse/signal/completing/stats')
  getSignalCompletingSseStats() {
    return {
      abortsObserved: this.completingAbortsObserved,
      subscriptionsStarted: this.completingSubscriptionsStarted,
      teardownsObserved: this.completingTeardownsObserved,
    };
  }

  // A long-running stream that is already subscribed when the client goes away,
  // exercising the abort listener registered from inside the producer.
  @Sse('sse/signal/streaming')
  sseSignalStreaming(
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      this.streamingSubscriptionsStarted += 1;

      const intervalId = setInterval(() => {
        subscriber.next({ data: { hello: 'world' } });
      }, 50);

      const onAbort = () => {
        this.streamingAbortsObserved += 1;
        subscriber.complete();
      };
      signal.addEventListener('abort', onAbort, { once: true });

      return () => {
        clearInterval(intervalId);
        signal.removeEventListener('abort', onAbort);
        this.streamingTeardownsObserved += 1;
      };
    });
  }

  @Get('sse/signal/streaming/stats')
  getSignalStreamingSseStats() {
    return {
      abortsObserved: this.streamingAbortsObserved,
      subscriptionsStarted: this.streamingSubscriptionsStarted,
      teardownsObserved: this.streamingTeardownsObserved,
    };
  }

  @Get('sse/signal/promise-delayed/stats')
  getSignalDelayedSseStats() {
    return {
      requestsStarted: this.signalRequestsStarted,
      resourcesAllocated: this.signalResourcesAllocated,
      resourcesCleaned: this.signalResourcesCleaned,
      subscriptionsStarted: this.signalSubscriptionsStarted,
    };
  }
}
