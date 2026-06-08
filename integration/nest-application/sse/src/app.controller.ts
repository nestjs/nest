import { IncomingMessage } from 'node:http';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Post,
  Query,
  Req,
  RequestMethod,
  Sse,
} from '@nestjs/common';
import { interval, map, Observable, of } from 'rxjs';

class SseQueryDto {
  @Type(() => Number)
  @IsInt()
  limit!: number;
}

@Controller()
export class AppController {
  private promiseDelayedRequestsStarted = 0;
  private promiseDelayedSubscriptionsStarted = 0;
  private promiseDelayedCloseEventsObserved = 0;
  private readonly promiseDelayedResolvers: Array<() => void> = [];

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
    this.promiseDelayedRequestsStarted += 1;
    const rawRequest = request.raw ?? request;

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

            return () => clearInterval(intervalId);
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
      subscriptionsStarted: this.promiseDelayedSubscriptionsStarted,
    };
  }
}
