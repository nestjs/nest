import { Injectable, type OnModuleInit } from '@nestjs/common';
import { OutboxEvents, OutboxRelay } from '@nestjs/outbox';

@Injectable()
export class OutboxMetrics implements OnModuleInit {
  readonly counters = {
    published: 0,
    retried: 0,
    deadLettered: 0,
    leaseLost: 0,
  };
  /** Time from add() to a successful publish, for the latest message. */
  lastPublishLagMs = 0;

  constructor(
    private readonly outboxEvents: OutboxEvents,
    private readonly outboxRelay: OutboxRelay,
  ) {}

  onModuleInit() {
    this.outboxEvents.events$.subscribe(event => {
      switch (event.type) {
        case 'published':
          this.counters.published++;
          this.lastPublishLagMs = Date.now() - event.message.createdAt;
          break;
        case 'retry-scheduled':
          this.counters.retried++;
          break;
        case 'dead-lettered':
          this.counters.deadLettered++;
          break;
        case 'lease-lost':
          this.counters.leaseLost++;
          break;
      }
    });
  }

  async snapshot() {
    // pending, ready, leased, deadLetters, lagMs (how long the longest-waiting message has waited)...
    const stats = await this.outboxRelay.stats();
    return {
      ...stats,
      ...this.counters,
      lastPublishLagMs: this.lastPublishLagMs,
    };
  }
}
