import { Input, Query, Router, Subscription, TrpcContext } from '@nestjs/trpc';
import {
  PingOutputSchema,
  TickEventSchema,
  TickInputSchema,
  UptimeOutputSchema,
  WhoamiOutputSchema,
} from './health.schema';

/**
 * A flat router (no alias) — procedures are registered at the root level.
 * Demonstrates query + subscription procedures with output schemas.
 */
@Router()
export class HealthRouter {
  @Query({ output: PingOutputSchema })
  ping() {
    return 'pong' as const;
  }

  @Query({ output: WhoamiOutputSchema })
  whoami(@TrpcContext('requestId') requestId: string) {
    return { requestId };
  }

  @Query({ output: UptimeOutputSchema })
  uptime() {
    return { uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Subscription({ input: TickInputSchema, output: TickEventSchema })
  async *ticks(
    @Input('count') count: number | undefined,
    @TrpcContext('requestId') requestId: string,
  ) {
    const total = count ?? 3;
    for (let tick = 1; tick <= total; tick++) {
      yield { tick, requestId };
    }
  }
}
