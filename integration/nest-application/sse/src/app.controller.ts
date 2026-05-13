import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { interval, map, Observable, of } from 'rxjs';

class SseQueryDto {
  @Type(() => Number)
  @IsInt()
  limit!: number;
}

@Controller()
export class AppController {
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
}
