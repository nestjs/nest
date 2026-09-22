import {
  type ArgumentsHost,
  type CallHandler,
  Catch,
  Controller,
  type ExceptionFilter,
  type ExecutionContext,
  Get,
  Injectable,
  type NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { interval, map, Observable, of } from 'rxjs';
import { concatMap, finalize } from 'rxjs/operators';

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

let ticks = 0;
let events: string[] = [];

export function resetState() {
  ticks = 0;
  events = [];
}

export function readTicks() {
  return ticks;
}

export function readEvents() {
  return events;
}

@Catch()
export class RecordingExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: Error, host: ArgumentsHost) {
    events.push(`filter:${exception.message}`);
    const response = host.switchToHttp().getResponse();
    this.adapterHost.httpAdapter.reply(response, { failed: true }, 500);
  }
}

@Injectable()
export class CommitInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      concatMap(async value => {
        await sleep(10);
        events.push('commit');
        return value;
      }),
      finalize(() => events.push('finalize')),
    );
  }
}

@Injectable()
export class WrapInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(value => ({ value })));
  }
}

@Controller()
export class AppController {
  @Get('observable')
  stream() {
    return interval(20).pipe(
      map(() => {
        ticks++;
        return { tick: ticks };
      }),
    );
  }

  @Get('observable-intercepted')
  @UseInterceptors(WrapInterceptor)
  interceptedStream() {
    return this.stream();
  }

  @Get('ticks')
  countTicks() {
    return { ticks };
  }

  @Get('final')
  final() {
    return of({ ok: true });
  }

  @Get('final-intercepted')
  @UseInterceptors(WrapInterceptor)
  async finalIntercepted() {
    await sleep(5);
    return of(1, 2, 3);
  }

  @Get('slow-intercepted')
  @UseInterceptors(CommitInterceptor)
  async slowIntercepted() {
    events.push('handler-start');
    await sleep(150);
    events.push('handler-done');
    return { ok: true };
  }

  @Get('slow-intercepted-error')
  @UseInterceptors(WrapInterceptor)
  async slowInterceptedError() {
    events.push('handler-start');
    await sleep(150);
    throw new Error('late failure');
  }
}
