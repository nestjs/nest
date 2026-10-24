import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import { CloudflareContext } from '@nestjs/platform-cloudflare';
import { interval, map, Observable, take } from 'rxjs';
import type { Env } from './env.js';

@Controller()
export class AppController {
  constructor(private readonly cloudflare: CloudflareContext<Env>) {}

  @Get()
  greet() {
    return {
      message: this.cloudflare.env.GREETING,
      colo: this.cloudflare.cf?.colo ?? null,
    };
  }

  @Sse('ticks')
  ticks(): Observable<MessageEvent> {
    return interval(100).pipe(
      take(3),
      map(tick => ({ data: { tick } })),
    );
  }
}
