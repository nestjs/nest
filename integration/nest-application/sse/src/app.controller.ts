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
  UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { IncomingMessage } from 'node:http';
import { interval, map, Observable, of } from 'rxjs';

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

    rawRequest.once('close', () => {
      this.promiseDelayedCloseEventsObserved += 1;
    });

    return new Promise(resolve => {
      this.promiseDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            this.promiseDelayedSubscriptionsStarted += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.promiseDelayedTeardownsObserved += 1;
              this.promiseDelayedRunningStreams -= 1;
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
    const rawRequest = request.socket ?? request;

    rawRequest.once('close', () => {
      this.interceptorDelayedCloseEventsObserved += 1;
    });

    return new Promise(resolve => {
      this.interceptorDelayedResolvers.push(() =>
        resolve(
          new Observable<MessageEvent>(subscriber => {
            this.interceptorDelayedSubscriptionsStarted += 1;
            this.interceptorDelayedRunningStreams += 1;

            const intervalId = setInterval(() => {
              subscriber.next({ data: { hello: 'world' } });
            }, 50);

            return () => {
              clearInterval(intervalId);
              this.interceptorDelayedTeardownsObserved += 1;
              this.interceptorDelayedRunningStreams -= 1;
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
}
